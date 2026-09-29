import mongoose from "mongoose";
import { EmailOutbox, Event, Order, Ticket, TicketType } from "../models";
import { AppError } from "../utils/app-error";
import { cursorPage, decodeCursor } from "../utils/cursor";
import { assertVersion, ifMatchVersion, preconditionFailed } from "../utils/if-match";
import { formatTicketCode, generateTicketCode, maskTicketCode, qrPayload } from "../utils/ticket-code";
import { uuidv7 } from "../utils/uuid";
import { effectiveCheckInOpensAt, userRefs, type Viewer } from "./event-access";
import { recordAudit, type AuditContext } from "./audit-service";
import { eventSummaries } from "./event-service";

type TicketStatus = "VALID" | "CHECKED_IN" | "VOID";
export interface TicketRecord {
  id: string; code: string; orderId: string; eventId: string; ticketTypeId: string; ownerId: string; holderName: string; status: TicketStatus;
  checkedInAt: Date | null; checkedInBy: string | null; voidedAt: Date | null; voidReason?: string | null; codeVersion: number; version: number;
  createdAt: Date; updatedAt: Date;
}
interface OrderRef { id: string; orderNumber: string; buyerName: string; buyerEmail: string; buyerPhone: string | null }

const now = () => new Date();
const ticketNotFound = () => new AppError(404, "ticket-not-found", "Tiket tidak ditemukan.");

export async function ticketTypeNames(ticketTypeIds: string[]) {
  const types = await TicketType.find({ id: { $in: [...new Set(ticketTypeIds)] } }).select({ id: 1, name: 1 }).lean<Array<{ id: string; name: string }>>();
  return new Map(types.map((type) => [type.id, type.name]));
}

export function ticketSummary(ticket: TicketRecord, typeName: string | null) {
  return { id: ticket.id, codeMasked: maskTicketCode(ticket.code), holderName: ticket.holderName, ticketTypeId: ticket.ticketTypeId, ticketTypeName: typeName, status: ticket.status, checkedInAt: ticket.checkedInAt ?? null };
}

// `Ticket` §8 (hanya pemilik): code/qrPayload null bila VOID.
async function ticketViews(tickets: TicketRecord[]) {
  const [names, events, orders] = await Promise.all([
    ticketTypeNames(tickets.map((ticket) => ticket.ticketTypeId)),
    eventSummaries(tickets.map((ticket) => ticket.eventId)),
    Order.find({ id: { $in: [...new Set(tickets.map((ticket) => ticket.orderId))] } }).select({ id: 1, orderNumber: 1 }).lean<OrderRef[]>(),
  ]);
  const orderNumbers = new Map(orders.map((order) => [order.id, order.orderNumber]));
  const at = now();
  return tickets.map((ticket) => {
    const summary = events.get(ticket.eventId);
    const { checkInOpensAt, ...event } = summary ?? { checkInOpensAt: null };
    const isVoid = ticket.status === "VOID";
    return {
      ...ticketSummary(ticket, names.get(ticket.ticketTypeId) ?? null),
      code: isVoid ? null : formatTicketCode(ticket.code), qrPayload: isVoid ? null : qrPayload(ticket.code),
      orderId: ticket.orderId, orderNumber: orderNumbers.get(ticket.orderId) ?? null, event: summary ? event : null,
      holderNameEditable: ticket.status === "VALID" && !!checkInOpensAt && at < checkInOpensAt,
      voidedAt: ticket.voidedAt ?? null, voidReason: ticket.voidReason ?? null, version: ticket.version, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
    };
  });
}

export async function ticketView(ticket: TicketRecord) {
  return (await ticketViews([ticket]))[0];
}

export async function listTickets(ownerId: string, input: { eventId?: string; status?: TicketStatus[]; when: "upcoming" | "past" | "all"; limit: number; cursor?: string }) {
  const applied = { eventId: input.eventId ?? null, status: input.status ?? null, when: input.when };
  const afterId = decodeCursor(input.cursor, applied);
  const filter: Record<string, unknown> = { ownerId };
  if (input.eventId) filter.eventId = input.eventId;
  if (input.status) filter.status = { $in: input.status };
  if (input.when !== "all") {
    const ids = await Event.find(input.when === "upcoming" ? { endAt: { $gte: now() } } : { endAt: { $lt: now() } }).distinct("id");
    filter.eventId = input.eventId ? (ids.includes(input.eventId) ? input.eventId : { $in: [] }) : { $in: ids };
  }
  if (afterId) filter.id = { $lt: afterId };
  const rows = await Ticket.find(filter).sort({ id: -1 }).limit(input.limit + 1).lean<TicketRecord[]>();
  const page = cursorPage(rows, input.limit, applied);
  return { data: await ticketViews(page.data), meta: page.meta };
}

async function ownTicket(ownerId: string, ticketId: string): Promise<TicketRecord> {
  const ticket = await Ticket.findOne({ id: ticketId, ownerId }).lean<TicketRecord>();
  if (!ticket) throw ticketNotFound();
  return ticket;
}

export async function getTicket(ownerId: string, ticketId: string) {
  return ticketView(await ownTicket(ownerId, ticketId));
}

export async function updateHolderName(ownerId: string, ticketId: string, header: string | undefined, holderName: string) {
  const expected = ifMatchVersion(header);
  const ticket = await ownTicket(ownerId, ticketId);
  const current = await ticketView(ticket);
  assertVersion(expected, ticket.version, current);
  if (!current.holderNameEditable) throw new AppError(409, "holder-name-locked", "Nama pemegang tiket tidak dapat diubah lagi.");
  const updated = await Ticket.findOneAndUpdate({ id: ticketId, version: expected, status: "VALID" }, { $set: { holderName }, $inc: { version: 1 } }, { new: true }).lean<TicketRecord>();
  if (!updated) throw preconditionFailed(await ticketView(await ownTicket(ownerId, ticketId)));
  return ticketView(updated);
}

// `Attendee` §8: proyeksi tiket untuk organizer/panitia. STAFF tidak melihat versi, kontak pembeli, maupun data pesanan.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}

export async function attendeeViews(tickets: TicketRecord[], role: Viewer["role"]) {
  const [names, orders, refs] = await Promise.all([
    ticketTypeNames(tickets.map((ticket) => ticket.ticketTypeId)),
    Order.find({ id: { $in: [...new Set(tickets.map((ticket) => ticket.orderId))] } }).select({ id: 1, orderNumber: 1, buyerName: 1, buyerEmail: 1, buyerPhone: 1 }).lean<OrderRef[]>(),
    userRefs(tickets.map((ticket) => ticket.checkedInBy)),
  ]);
  const byOrder = new Map(orders.map((order) => [order.id, order]));
  const organizer = role === "ORGANIZER";
  return tickets.map((ticket) => {
    const order = byOrder.get(ticket.orderId);
    return {
      ticketId: ticket.id, codeMasked: maskTicketCode(ticket.code), holderName: ticket.holderName, ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: names.get(ticket.ticketTypeId) ?? null, status: ticket.status, checkedInAt: ticket.checkedInAt ?? null, checkedInBy: refs(ticket.checkedInBy),
      buyerName: order?.buyerName ?? null, buyerEmail: order ? (organizer ? order.buyerEmail : maskEmail(order.buyerEmail)) : null,
      buyerPhone: organizer ? order?.buyerPhone ?? null : null, orderId: organizer ? ticket.orderId : null, orderNumber: organizer ? order?.orderNumber ?? null : null,
      codeVersion: organizer ? ticket.codeVersion : null, version: organizer ? ticket.version : null,
    };
  });
}

export async function reissueTicket(ticketId: string, header: string | undefined, reason: string, audit: AuditContext) {
  const expected = ifMatchVersion(header);
  const ticket = await Ticket.findOne({ id: ticketId }).lean<TicketRecord>();
  if (!ticket) throw ticketNotFound();
  assertVersion(expected, ticket.version, (await attendeeViews([ticket], "ORGANIZER"))[0]);
  if (ticket.status !== "VALID") throw new AppError(409, "ticket-not-reissuable", "Hanya tiket VALID yang dapat diterbitkan ulang.");
  const session = await mongoose.startSession();
  let updated: TicketRecord | null = null;
  try {
    await session.withTransaction(async () => {
      updated = await Ticket.findOneAndUpdate(
        { id: ticketId, version: expected, status: "VALID" },
        { $set: { code: generateTicketCode() }, $inc: { codeVersion: 1, version: 1 } },
        { new: true, session },
      ).lean<TicketRecord>();
      if (!updated) return;
      const order = await Order.findOne({ id: ticket.orderId }).select({ buyerEmail: 1 }).session(session).lean<OrderRef>();
      await EmailOutbox.create([{ id: uuidv7(), type: "TICKET_REISSUED", to: order?.buyerEmail ?? "", payload: { ticketId, orderId: ticket.orderId, codeVersion: updated.codeVersion }, orderId: ticket.orderId }], { session });
      await recordAudit(audit, { action: "TICKET_REISSUED", entityType: "Ticket", entityId: ticketId, eventId: ticket.eventId, before: { codeVersion: ticket.codeVersion }, after: { codeVersion: updated.codeVersion, reason } }, session);
    });
  } finally {
    await session.endSession();
  }
  if (!updated) {
    const latest = await Ticket.findOne({ id: ticketId }).lean<TicketRecord>();
    if (latest && latest.status !== "VALID") throw new AppError(409, "ticket-not-reissuable", "Hanya tiket VALID yang dapat diterbitkan ulang.");
    throw preconditionFailed(latest ? (await attendeeViews([latest], "ORGANIZER"))[0] : undefined);
  }
  return (await attendeeViews([updated], "ORGANIZER"))[0];
}
