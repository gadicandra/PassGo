import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { Payment } from "../models";
import { snapClient } from "../lib/midtrans";
import { issueTicketsForOrder } from "./ticket-issuance-service";
import { AppError } from "../utils/app-error";
import { getUserById } from "./auth-service";
import { EventModel, OrderModel, releaseReservation, reserveTicketType, type OrderItemRecord, type OrderRecord } from "./order-repository";
import type { SnapTransactionParameters } from "midtrans-client";

interface OrderInput {
  eventId: string;
  items: Array<{ ticketTypeId: string; quantity: number; expectedUnitPrice: number }>;
  buyerPhone?: string | null;
}

interface MidtransOrderPayload {
  transaction_details: { order_id: string; gross_amount: number };
  item_details: Array<{ id: string; price: number; quantity: number; name: string }>;
  customer_details: { first_name: string; email: string; phone?: string };
  custom_field1: string;
}

function orderNumber(): string {
  return `PG-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function createOrder(userId: string, input: OrderInput): Promise<OrderRecord> {
  const user = await getUserById(userId);
  if (!user || !user.isActive) throw new AppError(401, "token-revoked", "Akun tidak aktif.");
  if (!user.emailVerified) throw new AppError(403, "email-not-verified", "Email harus diverifikasi terlebih dahulu.");
  if (user.role !== "ATTENDEE") throw new AppError(403, "forbidden", "Hanya peserta yang dapat membuat pesanan.");

  const session = await mongoose.startSession();
  let created: OrderRecord | undefined;
  try {
    await session.withTransaction(async () => {
      const at = new Date();
      const event = await EventModel.findOne({ id: input.eventId }).session(session).lean();
      if (!event || event.status !== "PUBLISHED" || event.endAt <= at) throw new AppError(409, "event-not-on-sale", "Acara tidak sedang dijual.");

      const pending = await OrderModel.findOne({ userId, eventId: input.eventId, status: "PENDING_PAYMENT" }).session(session).lean();
      if (pending) throw new AppError(409, "pending-order-exists", "Masih ada pesanan yang belum dibayar.", { orderId: pending.id });

      const items: OrderItemRecord[] = [];
      for (const item of [...input.items].sort((left, right) => left.ticketTypeId.localeCompare(right.ticketTypeId))) {
        const reserved = await reserveTicketType(item.ticketTypeId, input.eventId, item.quantity, at, session);
        if (!reserved) throw new AppError(409, "quota-exceeded", "Kuota tiket tidak mencukupi.", { ticketTypeId: item.ticketTypeId });
        if (reserved.price !== item.expectedUnitPrice) throw new AppError(409, "price-changed", "Harga tiket sudah berubah.", { currentUnitPrice: reserved.price, ticketTypeId: item.ticketTypeId });
        items.push({ ticketTypeId: reserved.id, ticketTypeName: reserved.name, unitPrice: reserved.price, quantity: item.quantity, lineTotal: reserved.price * item.quantity });
      }

      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const createdAt = new Date();
      const id = randomUUID();
      const number = orderNumber();
      let payment: { snapToken: string; snapRedirectUrl: string } | undefined;
      if (total > 0) {
        try {
          const payload: MidtransOrderPayload = {
            transaction_details: { order_id: number, gross_amount: total },
            item_details: items.map((item) => ({ id: item.ticketTypeId, price: item.unitPrice, quantity: item.quantity, name: item.ticketTypeName.slice(0, 50) })),
            customer_details: { first_name: user.name, email: user.email, phone: input.buyerPhone ?? user.phone ?? undefined },
            custom_field1: id,
          };
          const snap = await snapClient().createTransaction(payload as unknown as SnapTransactionParameters);
          payment = { snapToken: snap.token, snapRedirectUrl: snap.redirect_url };
        } catch (error) {
          throw new AppError(502, "payment-gateway-error", "Payment gateway gagal.", { cause: error instanceof Error ? error.message : undefined });
        }
      }
      created = await OrderModel.create([{
        id,
        orderNumber: number,
        userId,
        eventId: input.eventId,
        status: total === 0 ? "PAID" : "PENDING_PAYMENT",
        subtotal: total,
        total,
        items,
        buyerName: user.name,
        buyerEmail: user.email,
        buyerPhone: input.buyerPhone ?? user.phone,
        expiresAt: total === 0 ? null : new Date(createdAt.getTime() + 30 * 60 * 1000),
        paidAt: total === 0 ? createdAt : null,
        expiredAt: null,
        cancelledAt: null,
        cancelReason: null,
        createdAt,
        updatedAt: createdAt,
      }], { session }).then((documents) => documents[0].toObject() as OrderRecord);
      if (payment) {
        await Payment.create([{ id: randomUUID(), orderId: id, provider: "MIDTRANS", providerOrderId: number, snapToken: payment.snapToken, snapRedirectUrl: payment.snapRedirectUrl, status: "PENDING", amount: total }], { session });
      } else if (created) {
        await issueTicketsForOrder(created, session);
      }
    });
  } finally {
    await session.endSession();
  }
  if (!created) throw new Error("Order transaction did not create an order");
  return created;
}

export async function listOrders(userId: string, role: string): Promise<OrderRecord[]> {
  return OrderModel.find(role === "ORGANIZER" ? {} : { userId }).sort({ createdAt: -1 }).lean<OrderRecord[]>();
}

export async function getOrder(userId: string, role: string, orderId: string): Promise<OrderRecord> {
  const order = await OrderModel.findOne(role === "ORGANIZER" ? { id: orderId } : { id: orderId, userId }).lean<OrderRecord>();
  if (!order) throw new AppError(404, "order-not-found", "Pesanan tidak ditemukan.");
  return order;
}

export async function cancelOrder(userId: string, role: string, orderId: string, reason: string | undefined): Promise<OrderRecord> {
  const session = await mongoose.startSession();
  let cancelled: OrderRecord | undefined;
  try {
    await session.withTransaction(async () => {
      const scope = role === "ORGANIZER" ? { id: orderId } : { id: orderId, userId };
      const order = await OrderModel.findOne(scope).session(session).lean<OrderRecord>();
      if (!order) throw new AppError(404, "order-not-found", "Pesanan tidak ditemukan.");
      if (order.status !== "PENDING_PAYMENT") throw new AppError(409, "order-not-cancellable", "Pesanan tidak dapat dibatalkan.");
      for (const item of order.items) await releaseReservation(item, session);
      const updated = await OrderModel.findOneAndUpdate({ ...scope, status: "PENDING_PAYMENT" }, { $set: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason ?? null, expiresAt: null, updatedAt: new Date() } }, { new: true, session }).lean<OrderRecord>();
      cancelled = updated ?? undefined;
    });
  } finally { await session.endSession(); }
  if (!cancelled) throw new Error("Order cancellation did not update an order");
  return cancelled;
}

export async function settleOrder(orderNumberValue: string, paymentInput: { transactionId?: string; paymentType?: string; providerStatus?: string }): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await OrderModel.findOne({ orderNumber: orderNumberValue }).session(session).lean<OrderRecord>();
      if (!order || order.status === "PAID") return;
      if (!["PENDING_PAYMENT", "EXPIRED", "CANCELLED"].includes(order.status)) return;
      const updated = await OrderModel.findOneAndUpdate({ id: order.id, status: { $in: ["PENDING_PAYMENT", "EXPIRED", "CANCELLED"] } }, { $set: { status: "PAID", paidAt: new Date(), updatedAt: new Date() } }, { new: true, session }).lean<OrderRecord>();
      if (!updated) return;
      await Payment.updateOne({ orderId: order.id }, { $set: { status: "SETTLED", providerTransactionId: paymentInput.transactionId ?? null, paymentType: paymentInput.paymentType ?? null, providerStatus: paymentInput.providerStatus ?? null, settledAt: new Date(), lastSyncedAt: new Date() } }, { session });
      await issueTicketsForOrder(updated, session);
    });
  } finally { await session.endSession(); }
}