import mongoose from "mongoose";
import { CheckIn, Event, Ticket } from "../models";
import { AppError } from "../utils/app-error";
import { cursorPage, decodeCursor } from "../utils/cursor";
import { normalizeTicketCode } from "../utils/ticket-code";
import { uuidv7 } from "../utils/uuid";
import { assertEventAccess, effectiveCheckInOpensAt, userRefs, type AccessEvent, type Viewer } from "./event-access";
import { recordAudit, type AuditContext } from "./audit-service";
import { ticketSummary, ticketTypeNames, type TicketRecord } from "./ticket-service";

type CheckInResult = "ACCEPTED" | "ALREADY_CHECKED_IN" | "TICKET_VOID" | "WRONG_EVENT" | "NOT_FOUND" | "CHECK_IN_CLOSED";
type CheckInMethod = "QR" | "MANUAL";
interface CheckInRecord {
  id: string; eventId: string; ticketId: string | null; scannedCodeMasked: string | null; method: CheckInMethod; result: CheckInResult;
  scannedBy: string; revertedAt: Date | null; revertedBy: string | null; revertReason: string | null; createdAt: Date;
}

const now = () => new Date();
const checkInNotFound = () => new AppError(404, "check-in-not-found", "Data check-in tidak ditemukan.");

async function checkInViews(rows: CheckInRecord[]) {
  const ticketIds = rows.filter((row) => row.ticketId && row.result !== "NOT_FOUND" && row.result !== "WRONG_EVENT").map((row) => row.ticketId!);
  const tickets = await Ticket.find({ id: { $in: [...new Set(ticketIds)] } }).lean<TicketRecord[]>();
  const [names, refs] = await Promise.all([ticketTypeNames(tickets.map((ticket) => ticket.ticketTypeId)), userRefs(rows.flatMap((row) => [row.scannedBy, row.revertedBy]))]);
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  return rows.map((row) => {
    const hidden = row.result === "NOT_FOUND" || row.result === "WRONG_EVENT";
    const ticket = !hidden && row.ticketId ? byId.get(row.ticketId) : undefined;
    return {
      id: row.id, eventId: row.eventId, result: row.result, method: row.method, ticket: ticket ? ticketSummary(ticket, names.get(ticket.ticketTypeId) ?? null) : null,
      scannedCodeMasked: hidden ? row.scannedCodeMasked : null, scannedBy: refs(row.scannedBy), revertedAt: row.revertedAt ?? null,
      revertedBy: refs(row.revertedBy), revertReason: row.revertReason ?? null, createdAt: row.createdAt,
    };
  });
}

export async function checkInView(row: CheckInRecord) {
  return (await checkInViews([row]))[0];
}

async function record(eventId: string, scannedBy: string, method: CheckInMethod, result: CheckInResult, ticketId: string | null, scannedCodeMasked: string | null) {
  const [created] = await CheckIn.create([{ id: uuidv7(), eventId, ticketId, scannedCodeMasked, method, result, scannedBy }]);
  return created.toObject() as unknown as CheckInRecord;
}

function isWindowOpen(event: AccessEvent, at: Date): boolean {
  return event.status === "PUBLISHED" && at >= effectiveCheckInOpensAt(event) && at <= event.endAt;
}

// Kontrak §9.12: NOT_FOUND → WRONG_EVENT → CHECK_IN_CLOSED → TICKET_VOID → ALREADY_CHECKED_IN → ACCEPTED. Setiap upaya dicatat.
export async function scanTicket(eventId: string, viewer: Viewer, input: { code?: string; ticketId?: string }) {
  const event = await assertEventAccess(eventId, viewer);
  const method: CheckInMethod = input.ticketId ? "MANUAL" : "QR";
  let ticket: TicketRecord | null = null;
  let tail: string | null = null;
  if (input.ticketId) {
    ticket = await Ticket.findOne({ id: input.ticketId }).lean<TicketRecord>();
    tail = ticket ? ticket.code.slice(-4) : null;
  } else {
    const normalized = normalizeTicketCode(input.code ?? "");
    tail = normalized.tail || null;
    if (normalized.code) ticket = await Ticket.findOne({ code: normalized.code }).lean<TicketRecord>();
  }

  if (!ticket) {
    await record(eventId, viewer.sub, method, "NOT_FOUND", null, tail);
    throw new AppError(404, "ticket-not-found", "Tiket tidak ditemukan.");
  }
  if (ticket.eventId !== eventId) {
    await record(eventId, viewer.sub, method, "WRONG_EVENT", null, tail);
    throw new AppError(409, "ticket-wrong-event", "Tiket bukan untuk acara ini.");
  }
  const at = now();
  if (!isWindowOpen(event, at)) {
    await record(eventId, viewer.sub, method, "CHECK_IN_CLOSED", ticket.id, null);
    throw new AppError(409, "check-in-closed", "Check-in belum dibuka atau sudah ditutup.", { checkInOpensAt: effectiveCheckInOpensAt(event), endAt: event.endAt });
  }

  // Penentu akhir: satu update atomik — dua pindaian bersamaan menghasilkan tepat satu ACCEPTED.
  const accepted = await Ticket.findOneAndUpdate({ id: ticket.id, eventId, status: "VALID" }, { $set: { status: "CHECKED_IN", checkedInAt: at, checkedInBy: viewer.sub } }, { new: true }).lean<TicketRecord>();
  if (accepted) return checkInView(await record(eventId, viewer.sub, method, "ACCEPTED", ticket.id, null));

  const latest = (await Ticket.findOne({ id: ticket.id }).lean<TicketRecord>()) ?? ticket;
  if (latest.status === "VOID") {
    await record(eventId, viewer.sub, method, "TICKET_VOID", ticket.id, null);
    throw new AppError(409, "ticket-void", "Tiket sudah dibatalkan.", { voidReason: latest.voidReason ?? null });
  }
  await record(eventId, viewer.sub, method, "ALREADY_CHECKED_IN", ticket.id, null);
  const [names, refs] = await Promise.all([ticketTypeNames([latest.ticketTypeId]), userRefs([latest.checkedInBy])]);
  throw new AppError(409, "ticket-already-checked-in", "Tiket sudah digunakan untuk check-in.", {
    checkIn: { checkedInAt: latest.checkedInAt, checkedInBy: refs(latest.checkedInBy), holderName: latest.holderName, ticketTypeName: names.get(latest.ticketTypeId) ?? null },
  });
}

export async function listCheckIns(eventId: string, viewer: Viewer, input: { result?: CheckInResult[]; method?: CheckInMethod; scannedById?: string; ticketId?: string; limit: number; cursor?: string }) {
  await assertEventAccess(eventId, viewer);
  const scannedById = viewer.role === "STAFF" ? viewer.sub : input.scannedById;
  const applied = { result: input.result ?? null, method: input.method ?? null, scannedById: scannedById ?? null, ticketId: input.ticketId ?? null };
  const afterId = decodeCursor(input.cursor, applied);
  const filter: Record<string, unknown> = { eventId };
  if (input.result) filter.result = { $in: input.result };
  if (input.method) filter.method = input.method;
  if (scannedById) filter.scannedBy = scannedById;
  if (input.ticketId) filter.ticketId = input.ticketId;
  if (afterId) filter.id = { $lt: afterId };
  const rows = await CheckIn.find(filter).sort({ id: -1 }).limit(input.limit + 1).lean<CheckInRecord[]>();
  const page = cursorPage(rows, input.limit, applied);
  return { data: await checkInViews(page.data), meta: page.meta };
}

export async function getCheckIn(eventId: string, viewer: Viewer, checkInId: string) {
  await assertEventAccess(eventId, viewer);
  const row = await CheckIn.findOne({ id: checkInId, eventId, ...(viewer.role === "STAFF" ? { scannedBy: viewer.sub } : {}) }).lean<CheckInRecord>();
  if (!row) throw checkInNotFound();
  return checkInView(row);
}

export async function revertCheckIn(eventId: string, checkInId: string, reason: string, audit: AuditContext & { actorId: string }) {
  const event = await Event.findOne({ id: eventId }).lean<AccessEvent>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  const row = await CheckIn.findOne({ id: checkInId, eventId }).lean<CheckInRecord>();
  if (!row) throw checkInNotFound();
  if (row.revertedAt) throw new AppError(409, "check-in-already-reverted", "Check-in ini sudah dibatalkan.");
  const notRevertible = () => new AppError(409, "check-in-not-revertible", "Check-in ini tidak dapat dibatalkan.");
  if (row.result !== "ACCEPTED" || !row.ticketId || event.status !== "PUBLISHED") throw notRevertible();
  const lastAccepted = await CheckIn.findOne({ ticketId: row.ticketId, result: "ACCEPTED" }).sort({ id: -1 }).lean<CheckInRecord>();
  if (lastAccepted?.id !== row.id) throw notRevertible();

  const at = now();
  const session = await mongoose.startSession();
  let reverted: CheckInRecord | null = null;
  try {
    await session.withTransaction(async () => {
      reverted = null;
      const ticket = await Ticket.findOneAndUpdate({ id: row.ticketId, eventId, status: "CHECKED_IN" }, { $set: { status: "VALID", checkedInAt: null, checkedInBy: null } }, { new: true, session }).lean<TicketRecord>();
      if (!ticket) throw notRevertible();
      reverted = await CheckIn.findOneAndUpdate({ id: checkInId, revertedAt: null }, { $set: { revertedAt: at, revertedBy: audit.actorId, revertReason: reason } }, { new: true, session }).lean<CheckInRecord>();
      if (!reverted) throw new AppError(409, "check-in-already-reverted", "Check-in ini sudah dibatalkan.");
      await recordAudit(audit, { action: "CHECK_IN_REVERTED", entityType: "CheckIn", entityId: checkInId, eventId, before: { ticketStatus: "CHECKED_IN" }, after: { ticketStatus: "VALID", reason } }, session);
    });
  } finally {
    await session.endSession();
  }
  return checkInView(reverted!);
}
