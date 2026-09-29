import { AuditLog, CheckIn, Order, Ticket, TicketType } from "../models";
import { AppError } from "../utils/app-error";
import { cursorPage, decodeCursor } from "../utils/cursor";
import { assertEventAccess, userRefs, type Viewer } from "./event-access";

interface TypeRow { id: string; name: string; price: number; quota: number; reservedCount: number }
interface PaidOrder { id: string; total: number; paidAt: Date | null; refundAmount: number | null; refundStatus: string; items: Array<{ quantity: number }> }

const localDate = (at: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);

// §9.13: dihitung saat request. ticketsSold dari status tiket (bukan soldCount); pendapatan hanya dari pesanan PAID.
export async function salesReport(eventId: string, viewer: Viewer) {
  const event = await assertEventAccess(eventId, viewer);
  const [types, statusCounts, paid, refundsRequired, soldByType] = await Promise.all([
    TicketType.find({ eventId }).sort({ sortOrder: 1, id: 1 }).lean<TypeRow[]>(),
    Order.aggregate<{ _id: string; n: number }>([{ $match: { eventId } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.find({ eventId, status: "PAID" }).select({ id: 1, total: 1, paidAt: 1, refundAmount: 1, refundStatus: 1, items: 1 }).lean<PaidOrder[]>(),
    Order.countDocuments({ eventId, refundStatus: "REQUIRED", status: { $ne: "PAID" } }),
    Ticket.aggregate<{ _id: string; n: number }>([
      { $match: { eventId, status: { $in: ["VALID", "CHECKED_IN"] } } },
      { $lookup: { from: "orders", localField: "orderId", foreignField: "id", as: "order", pipeline: [{ $project: { status: 1 } }] } },
      { $match: { "order.status": "PAID" } },
      { $group: { _id: "$ticketTypeId", n: { $sum: 1 } } },
    ]),
  ]);
  const sold = new Map(soldByType.map((row) => [row._id, row.n]));
  const revenueByType = new Map<string, number>();
  const paidItems = await Order.aggregate<{ _id: string; revenue: number }>([
    { $match: { eventId, status: "PAID" } }, { $unwind: "$items" }, { $group: { _id: "$items.ticketTypeId", revenue: { $sum: "$items.lineTotal" } } },
  ]);
  for (const row of paidItems) revenueByType.set(row._id, row.revenue);

  const byTicketType = types.map((type) => {
    const ticketsSold = sold.get(type.id) ?? 0;
    return { ticketTypeId: type.id, ticketTypeName: type.name, price: type.price, quota: type.quota, ticketsSold, ticketsReserved: type.reservedCount, ticketsAvailable: Math.max(0, type.quota - ticketsSold - type.reservedCount), grossRevenue: revenueByType.get(type.id) ?? 0 };
  });
  const grossRevenue = paid.reduce((sum, order) => sum + order.total, 0);
  const refundedAmount = paid.reduce((sum, order) => sum + (order.refundAmount ?? 0), 0);
  const daily = new Map<string, { date: string; ordersPaid: number; ticketsSold: number; grossRevenue: number }>();
  for (const order of paid) {
    if (!order.paidAt) continue;
    const date = localDate(order.paidAt, event.timezone);
    const day = daily.get(date) ?? { date, ordersPaid: 0, ticketsSold: 0, grossRevenue: 0 };
    day.ordersPaid += 1;
    day.ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);
    day.grossRevenue += order.total;
    daily.set(date, day);
  }
  const ordersByStatus = Object.fromEntries(["PENDING_PAYMENT", "PAID", "EXPIRED", "CANCELLED"].map((status) => [status, statusCounts.find((row) => row._id === status)?.n ?? 0]));
  const sum = (key: "quota" | "ticketsSold" | "ticketsReserved" | "ticketsAvailable") => byTicketType.reduce((total, row) => total + row[key], 0);
  return {
    data: {
      eventId, timezone: event.timezone,
      totals: { quota: sum("quota"), ticketsSold: sum("ticketsSold"), ticketsReserved: sum("ticketsReserved"), ticketsAvailable: sum("ticketsAvailable"), grossRevenue, refundedAmount, netRevenue: Math.max(0, grossRevenue - refundedAmount), ordersByStatus, refundsRequired },
      byTicketType,
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    },
    meta: { generatedAt: new Date().toISOString() },
  };
}

export async function attendanceReport(eventId: string, viewer: Viewer) {
  await assertEventAccess(eventId, viewer);
  const [types, ticketCounts, rejected, last] = await Promise.all([
    TicketType.find({ eventId }).sort({ sortOrder: 1, id: 1 }).lean<TypeRow[]>(),
    Ticket.aggregate<{ _id: { type: string; status: string }; n: number }>([{ $match: { eventId } }, { $group: { _id: { type: "$ticketTypeId", status: "$status" }, n: { $sum: 1 } } }]),
    CheckIn.aggregate<{ _id: string; n: number }>([{ $match: { eventId, result: { $ne: "ACCEPTED" } } }, { $group: { _id: "$result", n: { $sum: 1 } } }]),
    Ticket.findOne({ eventId, status: "CHECKED_IN" }).sort({ checkedInAt: -1 }).select({ checkedInAt: 1 }).lean<{ checkedInAt: Date | null }>(),
  ]);
  const count = (status: string, type?: string) => ticketCounts.filter((row) => row._id.status === status && (!type || row._id.type === type)).reduce((sum, row) => sum + row.n, 0);
  return {
    data: {
      eventId,
      ticketsValid: count("VALID"), ticketsCheckedIn: count("CHECKED_IN"), ticketsVoid: count("VOID"),
      byTicketType: types.map((type) => ({ ticketTypeId: type.id, ticketTypeName: type.name, ticketsIssued: count("VALID", type.id) + count("CHECKED_IN", type.id), ticketsCheckedIn: count("CHECKED_IN", type.id) })),
      rejectedScans: Object.fromEntries(["ALREADY_CHECKED_IN", "TICKET_VOID", "WRONG_EVENT", "NOT_FOUND", "CHECK_IN_CLOSED"].map((result) => [result, rejected.find((row) => row._id === result)?.n ?? 0])),
      lastCheckInAt: last?.checkedInAt ?? null,
    },
    meta: { generatedAt: new Date().toISOString() },
  };
}

interface AuditRow { id: string; actorId: string | null; actorRole: string; action: string; entityType: string; entityId: string; eventId: string | null; before: unknown; after: unknown; ip: string | null; userAgent: string | null; createdAt: Date }
export interface AuditQuery { eventId?: string; actorId?: string; action?: string[]; entityType?: string; entityId?: string; from?: Date; to?: Date; limit: number; cursor?: string }

// §9.14: cursor id desc. Filter dicatat apa adanya di appliedFilters (tanggal sebagai ISO) supaya cursor terikat pada filter yang sama.
export async function listAuditLogs(input: AuditQuery) {
  if (input.from && input.to && input.from > input.to) throw new AppError(422, "validation-error", "`from` harus sebelum `to`.", { errors: [{ parameter: "from", detail: "from > to." }] });
  const filters = { eventId: input.eventId ?? null, actorId: input.actorId ?? null, action: input.action ?? null, entityType: input.entityType ?? null, entityId: input.entityId ?? null, from: input.from?.toISOString() ?? null, to: input.to?.toISOString() ?? null };
  const after = decodeCursor(input.cursor, filters);
  const query: Record<string, unknown> = {};
  for (const key of ["eventId", "actorId", "entityType", "entityId"] as const) if (input[key]) query[key] = input[key];
  if (input.action) query.action = { $in: input.action };
  if (input.from || input.to) query.createdAt = { ...(input.from && { $gte: input.from }), ...(input.to && { $lte: input.to }) };
  if (after) query.id = { $lt: after };
  const rows = await AuditLog.find(query).sort({ id: -1 }).limit(input.limit + 1).lean<AuditRow[]>();
  const page = cursorPage(rows, input.limit, filters);
  const actor = await userRefs(page.data.flatMap((row) => row.actorId ?? []));
  return { ...page, data: page.data.map((row) => ({ id: row.id, actor: row.actorId ? actor(row.actorId) : null, actorRole: row.actorRole, action: row.action, entityType: row.entityType, entityId: row.entityId, eventId: row.eventId, before: row.before, after: row.after, ip: row.ip, userAgent: row.userAgent, createdAt: row.createdAt })) };
}
