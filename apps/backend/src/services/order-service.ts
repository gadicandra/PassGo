import { uuidv7 } from "../utils/uuid";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { EmailOutbox, Payment, Ticket } from "../models";
import { snapClient } from "../lib/midtrans";
import { issueTicketsForOrder } from "./ticket-issuance-service";
import { AppError } from "../utils/app-error";
import { maskTicketCode } from "../utils/ticket-code";
import { getUserById } from "./auth-service";
import { recordAudit, type AuditContext } from "./audit-service";
import { expireDueOrders, expireOrder } from "./order-expiry-service";
import { EventModel, OrderModel, TicketTypeModel, releaseReservation, reserveTicketType, type OrderItemRecord, type OrderRecord, type TicketTypeRecord } from "./order-repository";
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
  expiry: { start_time: string; unit: "minutes"; duration: number };
  callbacks?: { finish: string };
}

const SYSTEM: AuditContext = { actorId: null, actorRole: "SYSTEM" };

// Email e-ticket lewat outbox (dikirim job send-emails); kode tiket dibaca saat kirim, bukan saat antre.
export async function queueTicketEmail(order: Pick<OrderRecord, "id" | "orderNumber" | "buyerEmail">, session: mongoose.ClientSession): Promise<void> {
  await EmailOutbox.create([{ id: uuidv7(), type: "ORDER_TICKETS", to: order.buyerEmail, payload: { orderId: order.id, orderNumber: order.orderNumber }, orderId: order.id }], { session });
}

const holdMinutes = () => Number(process.env.ORDER_HOLD_MINUTES ?? 30) || 30;

// Midtrans menerima "YYYY-MM-DD HH:mm:ss +0700"; diformat dari instan yang sama dengan dasar expiresAt.
export function midtransTime(at: Date): string {
  const wib = new Date(at.getTime() + 7 * 60 * 60 * 1000).toISOString();
  return `${wib.slice(0, 10)} ${wib.slice(11, 19)} +0700`;
}

// item_details.name: "<eventTitle> - <ticketTypeName>", tanpa "|", maksimal 50 code point.
export function snapItemName(eventTitle: string, ticketTypeName: string): string {
  return [...`${eventTitle} - ${ticketTypeName}`.replaceAll("|", "")].slice(0, 50).join("");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms); })]).finally(() => clearTimeout(timer));
}

type OrderItemInput = OrderInput["items"][number];

// Aturan field kontrak (422) — dicek sebelum langkah transaksi 1–3 agar input tidak valid selalu 422, bukan 409.
export function validateOrderShape(items: OrderItemInput[], types: TicketTypeRecord[]): void {
  const byId = new Map(types.map((type) => [type.id, type]));
  const indexed = items.map((item, index) => ({ item, index })).sort((left, right) => left.item.ticketTypeId.localeCompare(right.item.ticketTypeId));
  const missing = indexed.filter(({ item }) => !byId.has(item.ticketTypeId));
  if (missing.length) throw new AppError(422, "validation-error", "Tipe tiket tidak ditemukan pada acara ini.", { errors: missing.map(({ index }) => ({ pointer: `#/items/${index}/ticketTypeId`, detail: "Tipe tiket bukan milik acara ini." })) });
  for (const { item, index } of indexed) {
    const type = byId.get(item.ticketTypeId)!;
    if (item.quantity > type.maxPerOrder) throw new AppError(422, "max-per-order-exceeded", `Maksimal ${type.maxPerOrder} tiket ${type.name} per pesanan.`, { errors: [{ pointer: `#/items/${index}/quantity`, detail: `Maksimal ${type.maxPerOrder}`, ticketTypeId: type.id, maxPerOrder: type.maxPerOrder }] });
  }
}

// Langkah 3 kontrak POST /orders — dievaluasi dari snapshot sebelum reservasi agar kode error bisa dibedakan;
// reservasi atomik tetap menjadi penentu akhir kuota.
export function validateOrderItems(items: OrderItemInput[], types: TicketTypeRecord[], at: Date): void {
  validateOrderShape(items, types);
  const byId = new Map(types.map((type) => [type.id, type]));
  const indexed = items.map((item, index) => ({ item, index })).sort((left, right) => left.item.ticketTypeId.localeCompare(right.item.ticketTypeId));
  for (const { item, index } of indexed) {
    const type = byId.get(item.ticketTypeId)!;
    if (!type.isActive || type.salesStartAt > at || type.salesEndAt <= at) throw new AppError(409, "ticket-type-not-on-sale", `Tiket ${type.name} tidak sedang dijual.`, { errors: [{ pointer: `#/items/${index}/ticketTypeId`, detail: "Tidak sedang dijual", ticketTypeId: type.id }] });
  }
  const shortages = indexed.flatMap(({ item, index }) => {
    const type = byId.get(item.ticketTypeId)!;
    const available = Math.max(0, type.quota - type.soldCount - type.reservedCount);
    return item.quantity > available ? [{ pointer: `#/items/${index}/quantity`, detail: `Tersisa ${available} tiket`, ticketTypeId: type.id, available }] : [];
  });
  if (shortages.length) throw new AppError(409, "quota-exceeded", "Kuota tiket tidak mencukupi.", { errors: shortages });
  const priceChanges = indexed.flatMap(({ item, index }) => {
    const type = byId.get(item.ticketTypeId)!;
    return type.price !== item.expectedUnitPrice ? [{ pointer: `#/items/${index}/expectedUnitPrice`, detail: "Harga berubah", ticketTypeId: type.id, currentUnitPrice: type.price }] : [];
  });
  if (priceChanges.length) throw new AppError(409, "price-changed", "Harga tiket sudah berubah.", { errors: priceChanges });
}

export function remainingForUser(limit: number | null, owned: number, requested: number): number | null {
  if (limit === null) return null;
  const remaining = Math.max(0, limit - owned);
  return owned + requested > limit ? remaining : null;
}

interface PaymentRecord { provider: string; status: string; paymentType: string | null; snapToken: string | null; snapRedirectUrl: string | null; settledAt: Date | null; lastSyncedAt: Date | null }
interface TicketRecord { id: string; code: string; holderName: string; ticketTypeId: string; status: string; checkedInAt: Date | null }

export { maskTicketCode };

// Bentuk `Order` §8: payment null untuk pesanan gratis, snapToken hanya untuk pemilik saat PENDING_PAYMENT, tickets berisi TicketSummary.
export function orderView(order: OrderRecord, payment: PaymentRecord | null, tickets: TicketRecord[], viewerIsOwner: boolean) {
  const names = new Map(order.items.map((item) => [item.ticketTypeId, item.ticketTypeName]));
  const exposeSnap = viewerIsOwner && order.status === "PENDING_PAYMENT";
  // .lean() melewati transform toJSON, jadi _id Mongo harus dibuang manual.
  const { _id, ...rest } = order as OrderRecord & { _id?: unknown };
  return {
    ...rest,
    payment: payment && {
      provider: payment.provider, status: payment.status, paymentType: payment.paymentType ?? null,
      snapToken: exposeSnap ? payment.snapToken : null, snapRedirectUrl: exposeSnap ? payment.snapRedirectUrl : null,
      settledAt: payment.settledAt ?? null, lastSyncedAt: payment.lastSyncedAt ?? null,
    },
    tickets: tickets.map((ticket) => ({ id: ticket.id, codeMasked: maskTicketCode(ticket.code), holderName: ticket.holderName, ticketTypeId: ticket.ticketTypeId, ticketTypeName: names.get(ticket.ticketTypeId) ?? null, status: ticket.status, checkedInAt: ticket.checkedInAt ?? null })),
  };
}

export type OrderView = ReturnType<typeof orderView>;

async function loadOrderView(order: OrderRecord, viewerId: string): Promise<OrderView> {
  const [payment, tickets] = await Promise.all([
    Payment.findOne({ orderId: order.id }).lean<PaymentRecord>(),
    Ticket.find({ orderId: order.id }).sort({ id: 1 }).lean<TicketRecord[]>(),
  ]);
  return orderView(order, payment, tickets, order.userId === viewerId);
}

function orderNumber(): string {
  return `PG-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function createOrder(userId: string, input: OrderInput): Promise<OrderView> {
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

      const types = await TicketTypeModel.find({ id: { $in: input.items.map((item) => item.ticketTypeId) }, eventId: input.eventId }).session(session).lean<TicketTypeRecord[]>();
      validateOrderShape(input.items, types);

      const pending = await OrderModel.findOne({ userId, eventId: input.eventId, status: "PENDING_PAYMENT" }).session(session).lean();
      if (pending) throw new AppError(409, "pending-order-exists", "Masih ada pesanan yang belum dibayar.", { orderId: pending.id });

      const requested = input.items.reduce((sum, item) => sum + item.quantity, 0);
      if (event.maxTicketsPerUser !== null) {
        const owned = await Ticket.countDocuments({ ownerId: userId, eventId: input.eventId, status: { $in: ["VALID", "CHECKED_IN"] } }).session(session);
        const remaining = remainingForUser(event.maxTicketsPerUser, owned, requested);
        if (remaining !== null) throw new AppError(409, "max-per-user-exceeded", `Maksimal ${event.maxTicketsPerUser} tiket per akun untuk acara ini.`, { remaining });
      }

      validateOrderItems(input.items, types, at);

      const items: OrderItemRecord[] = [];
      for (const item of [...input.items].sort((left, right) => left.ticketTypeId.localeCompare(right.ticketTypeId))) {
        const reserved = await reserveTicketType(item.ticketTypeId, input.eventId, item.quantity, at, session);
        if (!reserved) {
          const latest = await TicketTypeModel.findOne({ id: item.ticketTypeId }).session(session).lean<TicketTypeRecord>();
          const available = latest ? Math.max(0, latest.quota - latest.soldCount - latest.reservedCount) : 0;
          throw new AppError(409, "quota-exceeded", "Kuota tiket tidak mencukupi.", { errors: [{ pointer: `#/items/${input.items.indexOf(item)}/quantity`, detail: `Tersisa ${available} tiket`, ticketTypeId: item.ticketTypeId, available }] });
        }
        items.push({ ticketTypeId: reserved.id, ticketTypeName: reserved.name, unitPrice: reserved.price, quantity: item.quantity, lineTotal: reserved.price * item.quantity });
      }

      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const createdAt = new Date();
      const id = uuidv7();
      const number = orderNumber();
      let payment: { snapToken: string; snapRedirectUrl: string } | undefined;
      if (total > 0) {
        try {
          const payload: MidtransOrderPayload = {
            transaction_details: { order_id: number, gross_amount: total },
            item_details: items.map((item) => ({ id: item.ticketTypeId, price: item.unitPrice, quantity: item.quantity, name: snapItemName(event.title, item.ticketTypeName) })),
            customer_details: { first_name: user.name, email: user.email, phone: input.buyerPhone ?? user.phone ?? undefined },
            custom_field1: id,
            expiry: { start_time: midtransTime(createdAt), unit: "minutes", duration: holdMinutes() },
            ...(process.env.FRONTEND_URL ? { callbacks: { finish: `${process.env.FRONTEND_URL.replace(/\/$/, "")}/orders/${id}` } } : {}),
          };
          // Snap tetap di dalam transaksi (kontrak: gagal/timeout 10 detik → rollback seluruh reservasi → 502).
          const snap = await withTimeout(snapClient().createTransaction(payload as unknown as SnapTransactionParameters), 10_000);
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
        expiresAt: total === 0 ? null : new Date(createdAt.getTime() + holdMinutes() * 60 * 1000),
        paidAt: total === 0 ? createdAt : null,
        ticketEmailStatus: total === 0 ? "PENDING" : "NOT_APPLICABLE",
        expiredAt: null,
        cancelledAt: null,
        cancelReason: null,
        createdAt,
        updatedAt: createdAt,
      }], { session }).then((documents) => documents[0].toObject() as OrderRecord);
      if (payment) {
        await Payment.create([{ id: uuidv7(), orderId: id, provider: "MIDTRANS", providerOrderId: number, snapToken: payment.snapToken, snapRedirectUrl: payment.snapRedirectUrl, status: "PENDING", amount: total }], { session });
      } else if (created) {
        await issueTicketsForOrder(created, session);
        await queueTicketEmail(created, session);
      }
    });
  } finally {
    await session.endSession();
  }
  if (!created) throw new Error("Order transaction did not create an order");
  return loadOrderView(created, userId);
}

export async function listOrders(userId: string, role: string): Promise<OrderRecord[]> {
  // Lazy expiry: status yang dibaca klien tidak boleh tertinggal dari job terjadwal.
  await expireDueOrders(role === "ORGANIZER" ? {} : { userId });
  return OrderModel.find(role === "ORGANIZER" ? {} : { userId }).sort({ createdAt: -1 }).lean<OrderRecord[]>();
}

export async function getOrder(userId: string, role: string, orderId: string): Promise<OrderView> {
  const order = await OrderModel.findOne(role === "ORGANIZER" ? { id: orderId } : { id: orderId, userId }).lean<OrderRecord>();
  if (!order) throw new AppError(404, "order-not-found", "Pesanan tidak ditemukan.");
  if (order.status === "PENDING_PAYMENT" && order.expiresAt && order.expiresAt <= new Date() && (await expireOrder(order))) {
    return loadOrderView((await OrderModel.findOne({ id: order.id }).lean<OrderRecord>())!, userId);
  }
  return loadOrderView(order, userId);
}

export async function cancelOrder(userId: string, role: string, orderId: string, reason: string | undefined): Promise<OrderView> {
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
  return loadOrderView(cancelled, userId);
}

// Late settlement (arsitektur §7.2): pesanan EXPIRED/CANCELLED sudah melepas reservasinya, jadi kuota harus
// direservasi ulang secara kondisional sebelum tiket terbit. Gagal (kuota habis / acara batal / berakhir) →
// status tetap, refundStatus = REQUIRED. Dengan begitu overselling tetap mustahil.
async function reReserve(order: OrderRecord, session: mongoose.ClientSession): Promise<boolean> {
  const event = await EventModel.findOne({ id: order.eventId }).session(session).lean();
  if (!event || event.status !== "PUBLISHED" || event.endAt <= new Date()) return false;
  const done: OrderItemRecord[] = [];
  for (const item of order.items) {
    const reserved = await TicketTypeModel.updateOne(
      { id: item.ticketTypeId, eventId: order.eventId, $expr: { $lte: [{ $add: ["$soldCount", "$reservedCount", item.quantity] }, "$quota"] } },
      { $inc: { reservedCount: item.quantity } },
      { session },
    );
    if (reserved.modifiedCount !== 1) {
      for (const previous of done) await releaseReservation(previous, session);
      return false;
    }
    done.push(item);
  }
  return true;
}

export async function settleOrder(orderNumberValue: string, paymentInput: { transactionId?: string; paymentType?: string; providerStatus?: string }): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await OrderModel.findOne({ orderNumber: orderNumberValue }).session(session).lean<OrderRecord>();
      if (!order || !["PENDING_PAYMENT", "EXPIRED", "CANCELLED"].includes(order.status)) return;
      const at = new Date();
      const paymentSet = { status: "SETTLED", providerTransactionId: paymentInput.transactionId ?? null, paymentType: paymentInput.paymentType ?? null, providerStatus: paymentInput.providerStatus ?? null, settledAt: at, lastSyncedAt: at };
      const late = order.status !== "PENDING_PAYMENT";
      if (late && !(await reReserve(order, session))) {
        const flagged = await OrderModel.updateOne({ id: order.id, status: order.status, refundStatus: "NOT_REQUIRED" }, { $set: { refundStatus: "REQUIRED", updatedAt: at } }, { session });
        await Payment.updateOne({ orderId: order.id }, { $set: paymentSet }, { session });
        if (flagged.modifiedCount === 1) {
          await EmailOutbox.create([{ id: uuidv7(), type: "REFUND_REQUIRED", to: order.buyerEmail, payload: { orderId: order.id, orderNumber: order.orderNumber }, orderId: order.id }], { session });
          await recordAudit(SYSTEM, { action: "ORDER_REFUND_REQUIRED", entityType: "Order", entityId: order.id, eventId: order.eventId, before: { status: order.status, refundStatus: "NOT_REQUIRED" }, after: { refundStatus: "REQUIRED" } }, session);
        }
        return;
      }
      const updated = await OrderModel.findOneAndUpdate({ id: order.id, status: order.status }, { $set: { status: "PAID", paidAt: at, expiresAt: null, ticketEmailStatus: "PENDING", updatedAt: at } }, { new: true, session }).lean<OrderRecord>();
      if (!updated) throw new AppError(409, "order-state-changed", "Status pesanan berubah saat diproses.");
      await Payment.updateOne({ orderId: order.id }, { $set: paymentSet }, { session });
      await issueTicketsForOrder(updated, session);
      await queueTicketEmail(updated, session);
      if (late) await recordAudit(SYSTEM, { action: "ORDER_PAID_LATE", entityType: "Order", entityId: order.id, eventId: order.eventId, before: { status: order.status }, after: { status: "PAID" } }, session);
    });
  } finally { await session.endSession(); }
}

const TICKET_EMAIL_LIMIT = 3;
const TICKET_EMAIL_WINDOW_MS = 60 * 60 * 1000;

// §9.8 ticket-email. Rate limit `ticket-email` (3/jam per pesanan) dihitung dari baris outbox, bukan memori proses,
// sehingga tetap berlaku di serverless multi-instance.
export async function resendTicketEmail(userId: string, role: string, orderId: string): Promise<{ ticketEmailStatus: "PENDING" }> {
  const order = await OrderModel.findOne(role === "ORGANIZER" ? { id: orderId } : { id: orderId, userId }).lean<OrderRecord>();
  if (!order) throw new AppError(404, "order-not-found", "Pesanan tidak ditemukan.");
  if (order.status !== "PAID" || !(await Ticket.exists({ orderId, status: "VALID" }))) {
    throw new AppError(409, "ticket-email-unavailable", "E-ticket hanya dapat dikirim untuk pesanan lunas dengan tiket aktif.");
  }
  const since = new Date(Date.now() - TICKET_EMAIL_WINDOW_MS);
  const recent = await EmailOutbox.find({ orderId, type: "ORDER_TICKETS", createdAt: { $gt: since } }, { createdAt: 1 }).sort({ createdAt: 1 }).lean<Array<{ createdAt: Date }>>();
  if (recent.length >= TICKET_EMAIL_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((recent[recent.length - TICKET_EMAIL_LIMIT].createdAt.getTime() + TICKET_EMAIL_WINDOW_MS - Date.now()) / 1000));
    throw new AppError(429, "rate-limited", "Email e-ticket untuk pesanan ini sudah dikirim 3 kali dalam satu jam.", { retryAfter });
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await OrderModel.updateOne({ id: orderId }, { $set: { ticketEmailStatus: "PENDING", updatedAt: new Date() } }, { session });
      await queueTicketEmail(order, session);
    });
  } finally { await session.endSession(); }
  return { ticketEmailStatus: "PENDING" };
}
