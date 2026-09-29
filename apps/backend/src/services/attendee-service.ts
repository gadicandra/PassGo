import { Order, Ticket, User } from "../models";
import { formatTicketCode } from "../utils/ticket-code";
import { assertEventAccess, type Viewer } from "./event-access";
import { recordAudit, type AuditContext } from "./audit-service";
import { attendeeViews, type TicketRecord } from "./ticket-service";

type TicketStatus = "VALID" | "CHECKED_IN" | "VOID";
export type AttendeeSort = "holderName" | "checkedInAt" | "-checkedInAt" | "ticketTypeName";
interface OrderRow { id: string; orderNumber: string; buyerName: string; buyerEmail: string; buyerPhone: string | null }

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// `q` §9.11: nama pemegang, nama/email pembeli, ≥4 karakter terakhir kode, atau orderNumber (organizer). STAFF mencari email dengan nilai lengkap.
async function searchFilter(eventId: string, q: string, role: Viewer["role"]): Promise<Record<string, unknown>> {
  const pattern = new RegExp(escapeRegex(q), "i");
  const orderClauses: Record<string, unknown>[] = [{ buyerName: pattern }, { buyerEmail: role === "ORGANIZER" ? pattern : q.trim().toLowerCase() }];
  if (role === "ORGANIZER") orderClauses.push({ orderNumber: pattern });
  const orderIds = await Order.find({ eventId, $or: orderClauses }).distinct("id");
  const clauses: Record<string, unknown>[] = [{ holderName: pattern }, { orderId: { $in: orderIds } }];
  const tail = q.replace(/[\s-]/g, "").toUpperCase();
  if (tail.length >= 4 && /^[0-9A-Z]+$/.test(tail)) clauses.push({ code: new RegExp(`${escapeRegex(tail)}$`) });
  return { $or: clauses };
}

// Offset §4.1. Jumlah tiket per acara kecil (ribuan), jadi urutan ticketTypeName diselesaikan di memori setelah proyeksi.
export async function listAttendees(eventId: string, viewer: Viewer, input: { status: TicketStatus[]; ticketTypeId?: string; q?: string; sort: AttendeeSort; page: number; pageSize: number }) {
  await assertEventAccess(eventId, viewer);
  const filter: Record<string, unknown> = { eventId, status: { $in: input.status } };
  if (input.ticketTypeId) filter.ticketTypeId = input.ticketTypeId;
  if (input.q) Object.assign(filter, await searchFilter(eventId, input.q, viewer.role));
  const [tickets, counts] = await Promise.all([
    Ticket.find(filter).lean<TicketRecord[]>(),
    Ticket.aggregate<{ _id: TicketStatus; n: number }>([{ $match: { eventId } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const rows = await attendeeViews(tickets, viewer.role);
  const key = input.sort.replace(/^-/, "") as "holderName" | "checkedInAt" | "ticketTypeName";
  const direction = input.sort.startsWith("-") ? -1 : 1;
  rows.sort((left, right) => {
    const a = left[key] instanceof Date ? (left[key] as Date).getTime() : left[key] ?? "";
    const b = right[key] instanceof Date ? (right[key] as Date).getTime() : right[key] ?? "";
    if (a !== b) return (a < b ? -1 : 1) * direction;
    return left.ticketId < right.ticketId ? 1 : -1;
  });
  const count = (status: TicketStatus) => counts.find((row) => row._id === status)?.n ?? 0;
  const totalItems = rows.length;
  return {
    data: rows.slice((input.page - 1) * input.pageSize, input.page * input.pageSize),
    meta: {
      page: input.page, pageSize: input.pageSize, totalItems, totalPages: Math.ceil(totalItems / input.pageSize), sort: input.sort,
      appliedFilters: { status: input.status, ticketTypeId: input.ticketTypeId ?? null, q: input.q ?? null },
      counts: { valid: count("VALID"), checkedIn: count("CHECKED_IN"), void: count("VOID") },
    },
  };
}

// Anti formula injection §9.11.
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function localTime(at: Date | null, timeZone: string): string {
  if (!at) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export async function exportAttendeesCsv(eventId: string, viewer: Viewer, status: TicketStatus[], audit: AuditContext) {
  const event = await assertEventAccess(eventId, viewer);
  const tickets = await Ticket.find({ eventId, status: { $in: status } }).sort({ holderName: 1, id: 1 }).lean<TicketRecord[]>();
  const [rows, orders, checkers] = await Promise.all([
    attendeeViews(tickets, "ORGANIZER"),
    Order.find({ id: { $in: [...new Set(tickets.map((ticket) => ticket.orderId))] } }).lean<OrderRow[]>(),
    User.find({ id: { $in: [...new Set(tickets.flatMap((ticket) => ticket.checkedInBy ?? []))] } }).select({ id: 1, name: 1 }).lean<Array<{ id: string; name: string }>>(),
  ]);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const checkerName = new Map(checkers.map((user) => [user.id, user.name]));
  const header = ["ticketCode", "holderName", "ticketTypeName", "status", "checkedInAt", "checkedInByName", "buyerName", "buyerEmail", "buyerPhone", "orderNumber"];
  const lines = tickets.map((ticket, index) => {
    const order = orderById.get(ticket.orderId);
    return [formatTicketCode(ticket.code), ticket.holderName, rows[index].ticketTypeName, ticket.status, localTime(ticket.checkedInAt, event.timezone), ticket.checkedInBy ? checkerName.get(ticket.checkedInBy) ?? "" : "", order?.buyerName, order?.buyerEmail, order?.buyerPhone, order?.orderNumber].map(csvCell).join(",");
  });
  await recordAudit(audit, { action: "ATTENDEES_EXPORTED", entityType: "Event", entityId: eventId, eventId, after: { format: "csv", status, rows: tickets.length } });
  const stamp = localTime(new Date(), event.timezone).slice(0, 10).replaceAll("-", "");
  return { filename: `attendees-${event.slug}-${stamp}.csv`, body: `﻿${[header.join(","), ...lines].join("\r\n")}\r\n` };
}
