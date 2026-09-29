import mongoose from "mongoose";
import { EmailOutbox, Payment, Ticket } from "../models";
import { snapClient } from "../lib/midtrans";
import { AppError } from "../utils/app-error";
import { uuidv7 } from "../utils/uuid";
import { recordAudit, type AuditContext } from "./audit-service";
import { getOrder, settleOrder, type OrderView } from "./order-service";
import { EventModel, OrderModel, TicketTypeModel, releaseReservation, type OrderRecord } from "./order-repository";

type RefundableOrder = OrderRecord & { refundStatus: "NOT_REQUIRED" | "REQUIRED" | "REFUNDED" };
interface ProviderStatus { transaction_status?: string; fraud_status?: string; transaction_id?: string; payment_type?: string; gross_amount?: string }

// Efek refund §9.8 — dipakai endpoint manual (actor = organizer) dan status `refund` dari Midtrans (actor = SYSTEM).
async function applyRefund(order: RefundableOrder, input: { amount: number; note: string | null }, audit: AuditContext, session: mongoose.ClientSession): Promise<void> {
  const at = new Date();
  const updated = await OrderModel.updateOne(
    { id: order.id, refundStatus: order.refundStatus },
    { $set: { refundStatus: "REFUNDED", refundedAt: at, refundAmount: input.amount, refundNote: input.note, refundedBy: audit.actorId, updatedAt: at } },
    { session },
  );
  if (updated.modifiedCount !== 1) throw new AppError(409, "order-not-refundable", "Status refund pesanan berubah saat diproses.");
  const valid = await Ticket.find({ orderId: order.id, status: "VALID" }).session(session).select({ id: 1, ticketTypeId: 1 }).lean<Array<{ id: string; ticketTypeId: string }>>();
  if (valid.length > 0) {
    await Ticket.updateMany({ id: { $in: valid.map((ticket) => ticket.id) }, status: "VALID" }, { $set: { status: "VOID", voidedAt: at, voidReason: "ORDER_REFUNDED" }, $inc: { version: 1 } }, { session });
    // Kuota hanya dikembalikan bila penjualan masih mungkin berjalan; acara batal tidak menjual lagi.
    const event = await EventModel.findOne({ id: order.eventId }).session(session).lean();
    if (event?.status === "PUBLISHED" && order.status === "PAID") {
      const perType = new Map<string, number>();
      for (const ticket of valid) perType.set(ticket.ticketTypeId, (perType.get(ticket.ticketTypeId) ?? 0) + 1);
      for (const [ticketTypeId, count] of perType) await TicketTypeModel.updateOne({ id: ticketTypeId, soldCount: { $gte: count } }, { $inc: { soldCount: -count } }, { session });
    }
  }
  await Payment.updateOne({ orderId: order.id }, { $set: { status: "REFUNDED", lastSyncedAt: at } }, { session });
  await EmailOutbox.create([{ id: uuidv7(), type: "ORDER_REFUNDED", to: order.buyerEmail, payload: { orderId: order.id, orderNumber: order.orderNumber, amount: input.amount }, orderId: order.id }], { session });
  await recordAudit(audit, { action: "ORDER_REFUNDED", entityType: "Order", entityId: order.id, eventId: order.eventId, before: { refundStatus: order.refundStatus }, after: { refundStatus: "REFUNDED", refundAmount: input.amount, voidedTickets: valid.length } }, session);
}

export async function refundOrder(orderId: string, input: { amount: number; note: string }, audit: AuditContext & { actorId: string }): Promise<OrderView> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await OrderModel.findOne({ id: orderId }).session(session).lean<RefundableOrder>();
      if (!order) throw new AppError(404, "order-not-found", "Pesanan tidak ditemukan.");
      if (order.total <= 0) throw new AppError(409, "order-not-refundable", "Pesanan gratis tidak dapat di-refund.");
      if (order.refundStatus !== "REQUIRED") {
        const event = await EventModel.findOne({ id: order.eventId }).session(session).lean();
        if (order.status !== "PAID" || order.refundStatus !== "NOT_REQUIRED" || !event || event.endAt <= new Date()) throw new AppError(409, "order-not-refundable", "Pesanan tidak memenuhi syarat refund.");
        if (await Ticket.exists({ orderId, status: "CHECKED_IN" }).session(session)) throw new AppError(409, "order-has-checked-in-tickets", "Pesanan memiliki tiket yang sudah check-in.");
      }
      // v1 hanya refund penuh (§13).
      if (input.amount !== order.total) throw new AppError(422, "validation-error", "Hanya refund penuh yang didukung.", { errors: [{ pointer: "/amount", detail: `amount harus sama dengan total (${order.total}).` }] });
      await applyRefund(order, input, audit, session);
    });
  } finally { await session.endSession(); }
  return getOrder(audit.actorId, "ORGANIZER", orderId);
}

const isMidtrans404 = (error: unknown) => {
  const status = (error as { httpStatusCode?: unknown; ApiResponse?: { status_code?: unknown } }).httpStatusCode ?? (error as { ApiResponse?: { status_code?: unknown } }).ApiResponse?.status_code;
  return String(status) === "404";
};

async function fetchStatus(orderNumber: string): Promise<ProviderStatus | null> {
  try {
    const status = await Promise.race([
      snapClient().transaction.status(orderNumber) as Promise<ProviderStatus>,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("midtrans timeout")), 5000)),
    ]);
    return status;
  } catch (error) {
    // 404 = peserta belum memilih metode bayar; tidak ada yang perlu diterapkan.
    if (isMidtrans404(error)) return null;
    throw new AppError(502, "payment-gateway-error", "Gagal mengambil status dari Midtrans.");
  }
}

// Status Midtrans → transisi lokal, logika sama dengan webhook §9.9 (hanya maju; status tak dikenal tanpa efek).
async function applyProviderStatus(order: RefundableOrder, status: ProviderStatus): Promise<void> {
  const transactionStatus = status.transaction_status ?? "";
  const paid = ["settlement", "capture"].includes(transactionStatus) && (status.fraud_status === undefined || status.fraud_status === "accept");
  if (status.gross_amount !== undefined && Math.round(Number(status.gross_amount)) !== order.total) return;
  if (paid) {
    await settleOrder(order.orderNumber, { transactionId: status.transaction_id, paymentType: status.payment_type, providerStatus: transactionStatus });
    return;
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const at = new Date();
      await Payment.updateOne({ orderId: order.id }, { $set: { providerStatus: transactionStatus, lastSyncedAt: at, ...(status.payment_type && { paymentType: status.payment_type }) } }, { session });
      if (transactionStatus === "refund" && order.refundStatus !== "REFUNDED" && order.status === "PAID") {
        await applyRefund(order, { amount: order.total, note: null }, { actorId: null, actorRole: "SYSTEM" }, session);
        return;
      }
      if (transactionStatus === "partial_refund") {
        await Payment.updateOne({ orderId: order.id }, { $set: { status: "PARTIALLY_REFUNDED" } }, { session });
        return;
      }
      const terminal = transactionStatus === "expire" ? "EXPIRED" : ["cancel", "deny", "failure"].includes(transactionStatus) ? "CANCELLED" : null;
      if (!terminal || order.status !== "PENDING_PAYMENT") return;
      const moved = await OrderModel.updateOne(
        { id: order.id, status: "PENDING_PAYMENT" },
        { $set: terminal === "EXPIRED" ? { status: "EXPIRED", expiredAt: at, expiresAt: null, updatedAt: at } : { status: "CANCELLED", cancelledAt: at, expiresAt: null, updatedAt: at } },
        { session },
      );
      if (moved.modifiedCount !== 1) return;
      for (const item of order.items) await releaseReservation(item, session);
      const paymentStatus = transactionStatus === "expire" ? "EXPIRED" : transactionStatus === "deny" ? "DENIED" : transactionStatus === "failure" ? "FAILED" : "CANCELLED";
      await Payment.updateOne({ orderId: order.id }, { $set: { status: paymentStatus } }, { session });
    });
  } finally { await session.endSession(); }
}

// §9.8 payment/sync: gratis atau final (tanpa refund REQUIRED) → kembalikan Order tanpa memanggil Midtrans.
export async function syncPayment(userId: string, role: string, orderId: string): Promise<OrderView> {
  const order = await OrderModel.findOne(role === "ORGANIZER" ? { id: orderId } : { id: orderId, userId }).lean<RefundableOrder>();
  if (!order) throw new AppError(404, "order-not-found", "Pesanan tidak ditemukan.");
  const final = order.status !== "PENDING_PAYMENT" && order.refundStatus !== "REQUIRED";
  if (order.total > 0 && !final) {
    const status = await fetchStatus(order.orderNumber);
    if (status) await applyProviderStatus(order, status);
    else await Payment.updateOne({ orderId }, { $set: { lastSyncedAt: new Date() } });
  }
  return getOrder(userId, role, orderId);
}
