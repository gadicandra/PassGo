import { randomBytes } from "node:crypto";
import { Event, EventStaff, Order, Ticket, TicketType } from "../models";
import { uuidv7 } from "../utils/uuid";
import { AppError } from "../utils/app-error";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
type UserRole = "ORGANIZER" | "STAFF" | "ATTENDEE";

interface EventRecord {
  id: string; slug: string; title: string; description: string; venueName: string; venueAddress: string;
  mapsUrl: string | null; startAt: Date; endAt: Date; timezone: string; checkInOpensAt: Date | null;
  posterUrl: string | null; capacity: number | null; maxTicketsPerUser: number | null; status: EventStatus;
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

function versionFrom(header: string | undefined): number {
  const match = /^"(\d+)"$/.exec(header ?? "");
  if (!match || header === "*") throw new AppError(428, "precondition-required", "If-Match wajib dikirim.");
  return Number(match[1]);
}

function slugify(title: string): string {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110) || "event";
  return `${base}-${randomBytes(2).toString("hex")}`;
}

function statusForTicketType(type: { isActive: boolean; salesStartAt: Date; salesEndAt: Date; quota: number; soldCount: number; reservedCount: number }, eventStatus: EventStatus): string {
  if (!type.isActive) return "PAUSED";
  const current = now();
  if (eventStatus === "CANCELLED" || type.salesEndAt <= current) return "ENDED";
  if (type.salesStartAt > current) return "UPCOMING";
  if (type.quota - type.soldCount - type.reservedCount <= 0) return "SOLD_OUT";
  return "ON_SALE";
}

function ticketTypeResponse(type: TicketTypeRecord, eventStatus: EventStatus): TicketTypeView {
  return { ...type, available: Math.max(0, type.quota - type.soldCount - type.reservedCount), salesStatus: statusForTicketType(type, eventStatus) };
}

export async function listEvents(input: { status?: EventStatus[]; when: "upcoming" | "past" | "all"; q?: string; role?: UserRole }) {
  const filter: Record<string, unknown> = { status: { $in: input.status ?? ["PUBLISHED", "CANCELLED"] } };
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

function eventResponse(event: EventRecord, types: TicketTypeRecord[] = []) {
  const activeTypes = types.filter((type) => type.isActive);
  return {
    id: event.id, slug: event.slug, title: event.title, description: event.description, venueName: event.venueName,
    venueAddress: event.venueAddress, mapsUrl: event.mapsUrl, startAt: event.startAt, endAt: event.endAt, timezone: event.timezone,
    checkInOpensAt: event.checkInOpensAt ?? new Date(event.startAt.getTime() - 2 * 60 * 60 * 1000),
    checkInOpensAtIsDefault: event.checkInOpensAt == null, capacity: event.capacity, maxTicketsPerUser: event.maxTicketsPerUser,
    posterUrl: event.posterUrl, status: event.status, isEnded: event.endAt < now(),
    priceFrom: activeTypes.length ? Math.min(...activeTypes.map((type) => type.price)) : null,
    salesStatus: event.status === "CANCELLED" ? "ENDED" : activeTypes.some((type) => statusForTicketType(type, event.status) === "ON_SALE") ? "ON_SALE" : "UPCOMING",
    ticketTypes: types.map((type) => ticketTypeResponse(type, event.status)), version: event.version, createdBy: event.createdBy, createdAt: event.createdAt, updatedAt: event.updatedAt,
  };
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
  const version = versionFrom(header);
  const current = await Event.findOne({ id }).lean<EventRecord>();
  if (!current) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  if (current.status === "CANCELLED" || current.endAt < now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  if (input.capacity !== undefined) {
    const quota = await TicketType.aggregate([{ $match: { eventId: id } }, { $group: { _id: null, total: { $sum: "$quota" } } }]);
    if (input.capacity !== null && (quota[0]?.total ?? 0) > input.capacity) throw new AppError(422, "capacity-exceeded", "Kapasitas terlalu kecil.");
  }
  const updated = await Event.findOneAndUpdate({ id, version }, { $set: { ...input, updatedAt: now(), version: version + 1 } }, { new: true }).lean<EventRecord>();
  if (!updated) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.");
  const types = await TicketType.find({ eventId: id }).sort({ sortOrder: 1, price: 1 }).lean() as unknown as TicketTypeRecord[];
  return eventResponse(updated, types);
}

export async function deleteEvent(id: string, header: string | undefined): Promise<void> {
  const version = versionFrom(header);
  const event = await Event.findOne({ id, version }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  if (event.status !== "DRAFT") throw new AppError(409, "event-not-deletable", "Hanya acara DRAFT yang dapat dihapus.");
  if (await Order.exists({ eventId: id })) throw new AppError(409, "event-not-deletable", "Acara sudah memiliki pesanan.");
  await Promise.all([Event.deleteOne({ id, version }), TicketType.deleteMany({ eventId: id }), EventStaff.deleteMany({ eventId: id })]);
}

export async function publishEvent(id: string, header: string | undefined) {
  const version = versionFrom(header);
  const event = await Event.findOne({ id, version }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  const types = await TicketType.find({ eventId: id }).lean<TicketTypeRecord[]>();
  const errors: Array<{ pointer: string; detail: string }> = [];
  if (!event.description) errors.push({ pointer: "#/description", detail: "Description wajib diisi." });
  if (!event.venueAddress) errors.push({ pointer: "#/venueAddress", detail: "Venue address wajib diisi." });
  if (event.startAt <= now()) errors.push({ pointer: "#/startAt", detail: "StartAt harus di masa depan." });
  if (!types.some((type) => type.isActive)) errors.push({ pointer: "#/ticketTypes", detail: "Minimal satu tipe tiket aktif." });
  if (event.capacity !== null && types.reduce((sum, type) => sum + type.quota, 0) > event.capacity) errors.push({ pointer: "#/ticketTypes", detail: "Total kuota melebihi kapasitas." });
  if (errors.length) throw new AppError(422, "event-not-publishable", "Acara belum dapat diterbitkan.", { errors });
  const updated = await Event.findOneAndUpdate({ id, version, status: "DRAFT" }, { $set: { status: "PUBLISHED", publishedAt: now(), updatedAt: now(), version: version + 1 } }, { new: true }).lean<EventRecord>();
  if (!updated) throw new AppError(409, "event-not-draft", "Acara bukan DRAFT.");
  return eventResponse(updated, types);
}

export async function cancelEvent(id: string, header: string | undefined, reason: string) {
  const version = versionFrom(header);
  const updated = await Event.findOneAndUpdate({ id, version, status: "PUBLISHED", endAt: { $gt: now() } }, { $set: { status: "CANCELLED", cancelledAt: now(), cancelReason: reason, updatedAt: now(), version: version + 1 } }, { new: true }).lean<EventRecord>();
  if (!updated) throw new AppError(409, "event-not-cancellable", "Acara tidak dapat dibatalkan.");
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
  if (!event || event.status !== "PUBLISHED" || event.endAt <= now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  if (input.salesEndAt > event.endAt || input.salesStartAt >= input.salesEndAt) throw new AppError(422, "validation-error", "Rentang penjualan tidak valid.");
  if (event.capacity !== null) {
    const quota = await TicketType.aggregate([{ $match: { eventId } }, { $group: { _id: null, total: { $sum: "$quota" } } }]);
    if ((quota[0]?.total ?? 0) + input.quota > event.capacity) throw new AppError(422, "capacity-exceeded", "Total kuota melebihi kapasitas.");
  }
  const type = await TicketType.create({ id: uuidv7(), eventId, ...input, soldCount: 0, reservedCount: 0, version: 0 });
  return ticketTypeResponse(type.toObject() as unknown as TicketTypeRecord, event.status);
}

export async function updateTicketType(eventId: string, ticketTypeId: string, header: string | undefined, input: Partial<TicketTypeInput>) {
  const version = versionFrom(header);
  const type = await TicketType.findOne({ id: ticketTypeId, eventId }).lean<TicketTypeRecord>();
  if (!type) throw new AppError(404, "ticket-type-not-found", "Tipe tiket tidak ditemukan.");
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  if (!event || event.status === "CANCELLED" || event.endAt <= now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  if (input.quota !== undefined && input.quota < type.soldCount + type.reservedCount) throw new AppError(409, "quota-below-sold", "Kuota di bawah tiket yang sudah terjual atau dipesan.", { minimumQuota: type.soldCount + type.reservedCount });
  const updated = await TicketType.findOneAndUpdate({ id: ticketTypeId, eventId, version }, { $set: { ...input, updatedAt: now(), version: version + 1 } }, { new: true }).lean<TicketTypeRecord>();
  if (!updated) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.");
  return ticketTypeResponse(updated, event.status);
}

export async function deleteTicketType(eventId: string, ticketTypeId: string, header: string | undefined): Promise<void> {
  const version = versionFrom(header);
  const type = await TicketType.findOne({ id: ticketTypeId, eventId, version }).lean<TicketTypeRecord>();
  if (!type) throw new AppError(404, "ticket-type-not-found", "Tipe tiket tidak ditemukan.");
  if (type.soldCount > 0 || type.reservedCount > 0 || await Order.exists({ "items.ticketTypeId": ticketTypeId })) throw new AppError(409, "ticket-type-not-deletable", "Tipe tiket sudah digunakan.");
  await TicketType.deleteOne({ id: ticketTypeId, eventId, version });
}