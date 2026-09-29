import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { Event, EventStaff, Order, Ticket, TicketType } from "../models";
import { uuidv7 } from "../utils/uuid";
import { AppError } from "../utils/app-error";
import { assertVersion, ifMatchVersion, preconditionFailed } from "../utils/if-match";
import { removePoster, uploadPoster } from "../lib/storage";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
type UserRole = "ORGANIZER" | "STAFF" | "ATTENDEE";

interface EventRecord {
  id: string; slug: string; title: string; description: string; venueName: string; venueAddress: string;
  mapsUrl: string | null; startAt: Date; endAt: Date; timezone: string; checkInOpensAt: Date | null;
  posterUrl: string | null; posterPath: string | null; capacity: number | null; maxTicketsPerUser: number | null; status: EventStatus;
  publishedAt?: Date | null; cancelledAt?: Date | null; cancelReason?: string | null;
  createdBy: string; version: number; createdAt: Date; updatedAt: Date;
}

interface TicketTypeRecord {
  id: string; eventId: string; name: string; description: string | null; price: number; quota: number;
  soldCount: number; reservedCount: number; salesStartAt: Date; salesEndAt: Date; maxPerOrder: number;
  isActive: boolean; sortOrder: number; version: number;
}

export interface TicketTypeView extends TicketTypeRecord { available: number; salesStatus: string }
export interface EventInput { title: string; description: string; venueName: string; venueAddress: string; mapsUrl: string | null; startAt: Date; endAt: Date; timezone: string; checkInOpensAt: Date | null; capacity: number | null; maxTicketsPerUser: number | null }
export type TicketTypeInput = Omit<TicketTypeRecord, "id" | "eventId" | "soldCount" | "reservedCount" | "version">;

const now = () => new Date();

function slugify(title: string): string {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110) || "event";
  return `${base}-${randomBytes(2).toString("hex")}`;
}

function statusForTicketType(type: { isActive: boolean; salesStartAt: Date; salesEndAt: Date; quota: number; soldCount: number; reservedCount: number }, eventStatus: EventStatus, eventEnded = false): string {
  if (!type.isActive) return "PAUSED";
  const current = now();
  if (eventStatus === "CANCELLED" || eventEnded || type.salesEndAt <= current) return "ENDED";
  if (type.salesStartAt > current) return "UPCOMING";
  if (type.quota - type.soldCount - type.reservedCount <= 0) return "SOLD_OUT";
  return "ON_SALE";
}

function ticketTypeResponse(type: TicketTypeRecord, eventStatus: EventStatus, eventEnded = false): TicketTypeView {
  return { ...type, available: Math.max(0, type.quota - type.soldCount - type.reservedCount), salesStatus: statusForTicketType(type, eventStatus, eventEnded) };
}

// Representasi terbaru untuk body 412 (`current`) — kontrak §6.
async function currentEventView(id: string) {
  const event = await Event.findOne({ id }).lean<EventRecord>();
  if (!event) return undefined;
  const types = await TicketType.find({ eventId: id }).sort({ sortOrder: 1, price: 1 }).lean<TicketTypeRecord[]>();
  return eventResponse(event, types);
}

async function currentTicketTypeView(eventId: string, ticketTypeId: string, eventStatus: EventStatus) {
  const type = await TicketType.findOne({ id: ticketTypeId, eventId }).lean<TicketTypeRecord>();
  return type ? ticketTypeResponse(type, eventStatus) : undefined;
}

export function allowedStatuses(requested: EventStatus[] | undefined, role?: UserRole): EventStatus[] {
  const allowed: EventStatus[] = role === "ORGANIZER" ? ["DRAFT", "PUBLISHED", "CANCELLED"] : ["PUBLISHED", "CANCELLED"];
  return (requested ?? allowed).filter((status) => allowed.includes(status));
}

export async function listEvents(input: { status?: EventStatus[]; when: "upcoming" | "past" | "all"; q?: string; role?: UserRole }) {
  const filter: Record<string, unknown> = { status: { $in: allowedStatuses(input.status, input.role) } };
  if (input.when === "upcoming") filter.endAt = { $gte: now() };
  if (input.when === "past") filter.endAt = { $lt: now() };
  if (input.q) filter.$or = [{ title: { $regex: input.q, $options: "i" } }, { venueName: { $regex: input.q, $options: "i" } }];
  const events = await Event.find(filter).sort({ startAt: 1 }).lean<EventRecord[]>();
  const data = await Promise.all(events.map(async (event) => {
    const types = await TicketType.find({ eventId: event.id, ...(input.role === "ORGANIZER" ? {} : { isActive: true }) }).sort({ sortOrder: 1, price: 1 }).lean() as unknown as TicketTypeRecord[];
    return eventResponse(event, types);
  }));
  return { data, meta: { totalItems: data.length } };
}

// Agregat §4 EventSummary: ON_SALE > UPCOMING > SOLD_OUT (semua tipe aktif habis) > ENDED; acara CANCELLED selalu ENDED.
export function aggregateSalesStatus(statuses: string[], eventStatus: EventStatus): string {
  if (eventStatus === "CANCELLED") return "ENDED";
  if (statuses.includes("ON_SALE")) return "ON_SALE";
  if (statuses.includes("UPCOMING")) return "UPCOMING";
  if (statuses.length && statuses.every((status) => status === "SOLD_OUT")) return "SOLD_OUT";
  return "ENDED";
}

function eventResponse(event: EventRecord, types: TicketTypeRecord[] = []) {
  const activeTypes = types.filter((type) => type.isActive);
  const isEnded = event.endAt < now();
  return {
    id: event.id, slug: event.slug, title: event.title, description: event.description, venueName: event.venueName,
    venueAddress: event.venueAddress, mapsUrl: event.mapsUrl, startAt: event.startAt, endAt: event.endAt, timezone: event.timezone,
    checkInOpensAt: event.checkInOpensAt ?? new Date(event.startAt.getTime() - 2 * 60 * 60 * 1000),
    checkInOpensAtIsDefault: event.checkInOpensAt == null, capacity: event.capacity, maxTicketsPerUser: event.maxTicketsPerUser,
    posterUrl: event.posterUrl, status: event.status, isEnded,
    priceFrom: activeTypes.length ? Math.min(...activeTypes.map((type) => type.price)) : null,
    salesStatus: aggregateSalesStatus(activeTypes.map((type) => statusForTicketType(type, event.status, isEnded)), event.status),
    publishedAt: event.publishedAt ?? null, cancelledAt: event.cancelledAt ?? null, cancelReason: event.cancelReason ?? null,
    ticketTypes: types.map((type) => ticketTypeResponse(type, event.status, isEnded)), version: event.version, createdBy: event.createdBy, createdAt: event.createdAt, updatedAt: event.updatedAt,
  };
}

// `EventSummary` §8 tanpa stats (stats hanya untuk organizer/staff di endpoint acara) — dipakai proyeksi Ticket.
export async function eventSummaries(eventIds: string[]) {
  const events = await Event.find({ id: { $in: [...new Set(eventIds)] } }).lean<EventRecord[]>();
  const types = await TicketType.find({ eventId: { $in: events.map((event) => event.id) }, isActive: true }).lean<TicketTypeRecord[]>();
  return new Map(events.map((event) => {
    const full = eventResponse(event, types.filter((type) => type.eventId === event.id));
    return [event.id, {
      id: full.id, slug: full.slug, title: full.title, startAt: full.startAt, endAt: full.endAt, timezone: full.timezone, venueName: full.venueName,
      posterUrl: full.posterUrl, status: full.status, isEnded: full.isEnded, priceFrom: full.priceFrom, salesStatus: full.salesStatus, stats: null,
      checkInOpensAt: full.checkInOpensAt,
    }];
  }));
}

export async function getEvent(idOrSlug: string, role?: UserRole, bySlug = false) {
  const event = await Event.findOne(bySlug ? { slug: idOrSlug } : { id: idOrSlug }).lean<EventRecord>();
  if (!event || (event.status === "DRAFT" && role !== "ORGANIZER")) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  const types = await TicketType.find({ eventId: event.id, ...(role === "ORGANIZER" ? {} : { isActive: true }) }).sort({ sortOrder: 1, price: 1 }).lean() as unknown as TicketTypeRecord[];
  return eventResponse(event, types);
}

export async function createEvent(userId: string, input: EventInput) {
  const event = await Event.create({ id: uuidv7(), ...input, slug: slugify(input.title), status: "DRAFT", createdBy: userId, version: 0 });
  return eventResponse(event.toObject() as unknown as EventRecord);
}

export async function updateEvent(id: string, header: string | undefined, input: Partial<EventInput>) {
  const version = ifMatchVersion(header);
  const current = await Event.findOne({ id }).lean<EventRecord>();
  if (!current) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  assertVersion(version, current.version, await currentEventView(id));
  if (current.status === "CANCELLED" || current.endAt < now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  if (input.capacity !== undefined) {
    const quota = await TicketType.aggregate([{ $match: { eventId: id } }, { $group: { _id: null, total: { $sum: "$quota" } } }]);
    if (input.capacity !== null && (quota[0]?.total ?? 0) > input.capacity) throw new AppError(422, "capacity-exceeded", "Kapasitas terlalu kecil.");
  }
  const updated = await Event.findOneAndUpdate({ id, version }, { $set: { ...input, updatedAt: now(), version: version + 1 } }, { new: true }).lean<EventRecord>();
  if (!updated) throw preconditionFailed(await currentEventView(id));
  const types = await TicketType.find({ eventId: id }).sort({ sortOrder: 1, price: 1 }).lean() as unknown as TicketTypeRecord[];
  return eventResponse(updated, types);
}

export async function deleteEvent(id: string, header: string | undefined): Promise<void> {
  const version = ifMatchVersion(header);
  const event = await Event.findOne({ id }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  assertVersion(version, event.version, await currentEventView(id));
  if (event.status !== "DRAFT") throw new AppError(409, "event-not-deletable", "Hanya acara DRAFT yang dapat dihapus.");
  if (await Order.exists({ eventId: id })) throw new AppError(409, "event-not-deletable", "Acara sudah memiliki pesanan.");
  const deleted = await Event.deleteOne({ id, version });
  if (!deleted.deletedCount) throw preconditionFailed(await currentEventView(id));
  await Promise.all([TicketType.deleteMany({ eventId: id }), EventStaff.deleteMany({ eventId: id })]);
}

export async function publishEvent(id: string, header: string | undefined) {
  const version = ifMatchVersion(header);
  const event = await Event.findOne({ id }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  assertVersion(version, event.version, await currentEventView(id));
  if (event.status !== "DRAFT") throw new AppError(409, "event-not-draft", "Acara bukan DRAFT.");
  const types = await TicketType.find({ eventId: id }).lean<TicketTypeRecord[]>();
  const errors: Array<{ pointer: string; detail: string }> = [];
  if (!event.description) errors.push({ pointer: "#/description", detail: "Description wajib diisi." });
  if (!event.venueAddress) errors.push({ pointer: "#/venueAddress", detail: "Venue address wajib diisi." });
  if (event.startAt <= now()) errors.push({ pointer: "#/startAt", detail: "StartAt harus di masa depan." });
  if (!types.some((type) => type.isActive)) errors.push({ pointer: "#/ticketTypes", detail: "Minimal satu tipe tiket aktif." });
  if (event.capacity !== null && types.reduce((sum, type) => sum + type.quota, 0) > event.capacity) errors.push({ pointer: "#/ticketTypes", detail: "Total kuota melebihi kapasitas." });
  if (errors.length) throw new AppError(422, "event-not-publishable", "Acara belum dapat diterbitkan.", { errors });
  const updated = await Event.findOneAndUpdate({ id, version, status: "DRAFT" }, { $set: { status: "PUBLISHED", publishedAt: now(), updatedAt: now(), version: version + 1 } }, { new: true }).lean<EventRecord>();
  if (!updated) throw preconditionFailed(await currentEventView(id));
  return eventResponse(updated, types);
}

export async function cancelEvent(id: string, header: string | undefined, reason: string) {
  const version = ifMatchVersion(header);
  const event = await Event.findOne({ id }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  assertVersion(version, event.version, await currentEventView(id));
  if (event.status !== "PUBLISHED" || event.endAt <= now()) throw new AppError(409, "event-not-cancellable", "Acara tidak dapat dibatalkan.");
  const updated = await Event.findOneAndUpdate({ id, version, status: "PUBLISHED", endAt: { $gt: now() } }, { $set: { status: "CANCELLED", cancelledAt: now(), cancelReason: reason, updatedAt: now(), version: version + 1 } }, { new: true }).lean<EventRecord>();
  if (!updated) throw preconditionFailed(await currentEventView(id));
  const types = await TicketType.find({ eventId: id }).lean<TicketTypeRecord[]>();
  await Ticket.updateMany({ eventId: id, status: { $in: ["VALID", "CHECKED_IN"] } }, { $set: { status: "VOID", voidReason: "EVENT_CANCELLED", voidedAt: now() } });
  return eventResponse(updated, types);
}

export async function listTicketTypes(eventId: string, organizer: boolean) {
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  if (!event || (event.status === "DRAFT" && !organizer)) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  const types = await TicketType.find({ eventId, ...(organizer ? {} : { isActive: true }) }).sort({ sortOrder: 1, price: 1 }).lean<TicketTypeRecord[]>();
  return { data: types.map((type) => ticketTypeResponse(type, event.status)), meta: { totalItems: types.length } };
}

export async function createTicketType(eventId: string, input: TicketTypeInput) {
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  if (!event || event.status === "CANCELLED" || event.endAt <= now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  if (input.salesEndAt > event.endAt || input.salesStartAt >= input.salesEndAt) throw new AppError(422, "validation-error", "Rentang penjualan tidak valid.");
  if (event.capacity !== null) {
    const quota = await TicketType.aggregate([{ $match: { eventId } }, { $group: { _id: null, total: { $sum: "$quota" } } }]);
    if ((quota[0]?.total ?? 0) + input.quota > event.capacity) throw new AppError(422, "capacity-exceeded", "Total kuota melebihi kapasitas.");
  }
  const type = await TicketType.create({ id: uuidv7(), eventId, ...input, soldCount: 0, reservedCount: 0, version: 0 });
  return ticketTypeResponse(type.toObject() as unknown as TicketTypeRecord, event.status);
}

export async function updateTicketType(eventId: string, ticketTypeId: string, header: string | undefined, input: Partial<TicketTypeInput>) {
  const version = ifMatchVersion(header);
  const type = await TicketType.findOne({ id: ticketTypeId, eventId }).lean<TicketTypeRecord>();
  if (!type) throw new AppError(404, "ticket-type-not-found", "Tipe tiket tidak ditemukan.");
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  assertVersion(version, type.version, ticketTypeResponse(type, event?.status ?? "DRAFT"));
  if (!event || event.status === "CANCELLED" || event.endAt <= now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  if (input.quota !== undefined && input.quota < type.soldCount + type.reservedCount) throw new AppError(409, "quota-below-sold", "Kuota di bawah tiket yang sudah terjual atau dipesan.", { minimumQuota: type.soldCount + type.reservedCount });
  const updated = await TicketType.findOneAndUpdate({ id: ticketTypeId, eventId, version }, { $set: { ...input, updatedAt: now(), version: version + 1 } }, { new: true }).lean<TicketTypeRecord>();
  if (!updated) throw preconditionFailed(await currentTicketTypeView(eventId, ticketTypeId, event.status));
  return ticketTypeResponse(updated, event.status);
}

export async function deleteTicketType(eventId: string, ticketTypeId: string, header: string | undefined): Promise<void> {
  const version = ifMatchVersion(header);
  const type = await TicketType.findOne({ id: ticketTypeId, eventId }).lean<TicketTypeRecord>();
  if (!type) throw new AppError(404, "ticket-type-not-found", "Tipe tiket tidak ditemukan.");
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  assertVersion(version, type.version, ticketTypeResponse(type, event?.status ?? "DRAFT"));
  if (type.soldCount > 0 || type.reservedCount > 0 || await Order.exists({ "items.ticketTypeId": ticketTypeId })) throw new AppError(409, "ticket-type-not-deletable", "Tipe tiket sudah digunakan.");
  const deleted = await TicketType.deleteOne({ id: ticketTypeId, eventId, version });
  if (!deleted.deletedCount) throw preconditionFailed(await currentTicketTypeView(eventId, ticketTypeId, event?.status ?? "DRAFT"));
}

const POSTER_FORMATS = ["jpeg", "png", "webp"];
const POSTER_MIN_SIDE = 600;

async function editableEvent(id: string, header: string | undefined) {
  const version = ifMatchVersion(header);
  const event = await Event.findOne({ id }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  assertVersion(version, event.version, await currentEventView(id));
  if (event.status === "CANCELLED" || event.endAt < now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  return { event, version };
}

async function eventWithTypes(event: EventRecord) {
  const types = await TicketType.find({ eventId: event.id }).sort({ sortOrder: 1, price: 1 }).lean() as unknown as TicketTypeRecord[];
  return eventResponse(event, types);
}

// Diekspor agar aturan 415/422 bisa diuji tanpa database.
export async function encodePoster(file: Buffer): Promise<Buffer> {
  // sharp membaca format dari isi berkas, bukan dari header klien.
  const meta = await sharp(file).metadata().catch(() => null);
  if (!meta?.format || !POSTER_FORMATS.includes(meta.format)) throw new AppError(415, "unsupported-media-type", "Poster harus JPEG, PNG, atau WebP.");
  if ((meta.width ?? 0) < POSTER_MIN_SIDE || (meta.height ?? 0) < POSTER_MIN_SIDE) {
    throw new AppError(422, "poster-too-small", `Poster minimal ${POSTER_MIN_SIDE}x${POSTER_MIN_SIDE} piksel.`, { width: meta.width ?? 0, height: meta.height ?? 0 });
  }
  // Re-encode sekaligus membuang metadata EXIF (termasuk GPS) dan payload yang disisipkan.
  return sharp(file).webp({ quality: 82 }).toBuffer();
}

export async function setEventPoster(id: string, header: string | undefined, file: Buffer | undefined) {
  const { event, version } = await editableEvent(id, header);
  if (!file?.length) throw new AppError(422, "validation-error", "Berkas poster wajib dikirim.", { errors: [{ pointer: "/poster", detail: "Berkas poster wajib dikirim." }] });

  const stored = await uploadPoster(id, await encodePoster(file));

  const updated = await Event.findOneAndUpdate(
    { id, version },
    { $set: { posterUrl: stored.url, posterPath: stored.path, updatedAt: now(), version: version + 1 } },
    { new: true },
  ).lean<EventRecord>();
  if (!updated) {
    await removePoster(stored.path);
    throw preconditionFailed(await currentEventView(id));
  }
  if (event.posterPath) await removePoster(event.posterPath);
  return eventWithTypes(updated);
}

export async function removeEventPoster(id: string, header: string | undefined) {
  const { event, version } = await editableEvent(id, header);
  if (!event.posterPath && !event.posterUrl) return eventWithTypes(event);

  const updated = await Event.findOneAndUpdate(
    { id, version },
    { $set: { posterUrl: null, posterPath: null, updatedAt: now(), version: version + 1 } },
    { new: true },
  ).lean<EventRecord>();
  if (!updated) throw preconditionFailed(await currentEventView(id));
  if (event.posterPath) await removePoster(event.posterPath);
  return eventWithTypes(updated);
}
