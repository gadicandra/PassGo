import { Router } from "express";
import { z } from "zod";
import { optionalAuthenticate, roleOf, type AuthenticatedRequest } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  cancelEvent, createEvent, createTicketType, deleteEvent, deleteTicketType, getEvent, listEvents, listTicketTypes, publishEvent, updateEvent, updateTicketType,
} from "../services/event-service";
import type { EventInput, TicketTypeInput, TicketTypeView } from "../services/event-service";
import { AppError } from "../utils/app-error";
import { assignEventStaff, listEventStaff, removeEventStaff } from "../services/event-staff-service";
import { getCheckIn, listCheckIns, revertCheckIn, scanTicket } from "../services/check-in-service";
import { exportAttendeesCsv, listAttendees } from "../services/attendee-service";

const router = Router();
const date = z.coerce.date();
const eventStatus = z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]);
// Field tanpa default: .partial() di Zod 4 tetap menjalankan .default(), sehingga PATCH parsial akan menimpa field yang tidak dikirim.
const eventFields = {
  title: z.string().trim().min(3).max(150), description: z.string().max(10000), venueName: z.string().trim().min(2).max(150), venueAddress: z.string().max(300), mapsUrl: z.string().url().nullable(), startAt: date, endAt: date, timezone: z.string().max(40), checkInOpensAt: date.nullable(), capacity: z.number().int().min(1).max(100000).nullable(), maxTicketsPerUser: z.number().int().min(1).max(100).nullable(),
};
const eventShape = z.object({
  ...eventFields, description: eventFields.description.default(""), venueAddress: eventFields.venueAddress.default(""), mapsUrl: eventFields.mapsUrl.default(null), timezone: eventFields.timezone.default("Asia/Jakarta"), checkInOpensAt: eventFields.checkInOpensAt.default(null), capacity: eventFields.capacity.default(null), maxTicketsPerUser: eventFields.maxTicketsPerUser.default(null),
}).strict();
const eventBody = eventShape.superRefine((value, context) => { if (value.endAt <= value.startAt) context.addIssue({ code: "custom", path: ["endAt"], message: "endAt harus setelah startAt." }); });
export const eventPatch = z.object(eventFields).partial().strict();
const cancelBody = z.object({ reason: z.string().trim().min(5).max(500) }).strict();
const ticketTypeFields = { name: z.string().trim().min(2).max(50), description: z.string().max(500).nullable(), price: z.number().int().min(0), quota: z.number().int().min(1).max(100000), salesStartAt: date, salesEndAt: date, maxPerOrder: z.number().int().min(1).max(20), isActive: z.boolean(), sortOrder: z.number().int().min(0).max(999) };
const ticketTypeBody = z.object({ ...ticketTypeFields, description: ticketTypeFields.description.default(null), maxPerOrder: ticketTypeFields.maxPerOrder.default(5), isActive: ticketTypeFields.isActive.default(true), sortOrder: ticketTypeFields.sortOrder.default(0) }).strict();
export const ticketTypePatch = z.object(ticketTypeFields).partial().strict();

router.get("/", optionalAuthenticate, async (request, response, next) => {
  try { const query = z.object({ status: z.string().optional(), when: z.enum(["upcoming", "past", "all"]).default("upcoming"), q: z.string().min(2).optional() }).parse(request.query); const statuses = query.status?.split(",").map((value) => eventStatus.parse(value)); response.vary("Authorization"); if (!request.header("authorization")) response.set("Cache-Control", "public, max-age=60"); response.json(await listEvents({ status: statuses, when: query.when, q: query.q, role: roleOf(request) })); } catch (error) { next(error); }
});

router.get("/by-slug/:slug", optionalAuthenticate, async (request, response, next) => {
  try { response.vary("Authorization"); response.json({ data: await getEvent(String(request.params.slug), roleOf(request), true) }); } catch (error) { next(error); }
});

router.post("/", authorize("ORGANIZER"), async (request, response, next) => {
  try { const event = await createEvent((request as AuthenticatedRequest).user.sub, eventBody.parse(request.body) as EventInput); response.status(201).location(`/api/v1/events/${event.id}`).json({ data: event }); } catch (error) { next(error); }
});

router.patch("/:eventId", authorize("ORGANIZER"), async (request, response, next) => {
  try { const event = await updateEvent(String(request.params.eventId), request.get("if-match"), eventPatch.parse(request.body)); response.set("ETag", `"${event.version}"`).json({ data: event }); } catch (error) { next(error); }
});

router.delete("/:eventId", authorize("ORGANIZER"), async (request, response, next) => {
  try { await deleteEvent(String(request.params.eventId), request.get("if-match")); response.status(204).send(); } catch (error) { next(error); }
});

router.post("/:eventId/publish", authorize("ORGANIZER"), async (request, response, next) => {
  try { const event = await publishEvent(String(request.params.eventId), request.get("if-match")); response.set("ETag", `"${event.version}"`).json({ data: event }); } catch (error) { next(error); }
});

router.post("/:eventId/cancel", authorize("ORGANIZER"), async (request, response, next) => {
  try { const event = await cancelEvent(String(request.params.eventId), request.get("if-match"), cancelBody.parse(request.body).reason); response.set("ETag", `"${event.version}"`).json({ data: event }); } catch (error) { next(error); }
});

router.get("/:eventId/staff", authorize("ORGANIZER"), async (request, response, next) => {
  try { response.json({ data: await listEventStaff(String(request.params.eventId)) }); } catch (error) { next(error); }
});

router.put("/:eventId/staff/:userId", authorize("ORGANIZER"), async (request, response, next) => {
  try { const result = await assignEventStaff(String(request.params.eventId), String(request.params.userId), (request as AuthenticatedRequest).user.sub); response.status(result.status).json({ data: result.assignment }); } catch (error) { next(error); }
});

router.delete("/:eventId/staff/:userId", authorize("ORGANIZER"), async (request, response, next) => {
  try { await removeEventStaff(String(request.params.eventId), String(request.params.userId)); response.status(204).send(); } catch (error) { next(error); }
});

router.get("/:eventId/ticket-types", optionalAuthenticate, async (request, response, next) => {
  try { response.vary("Authorization"); response.json(await listTicketTypes(String(request.params.eventId), roleOf(request) === "ORGANIZER")); } catch (error) { next(error); }
});

router.post("/:eventId/ticket-types", authorize("ORGANIZER"), async (request, response, next) => {
  try { const type = await createTicketType(String(request.params.eventId), ticketTypeBody.parse(request.body) as TicketTypeInput); response.status(201).json({ data: type }); } catch (error) { next(error); }
});

router.get("/:eventId/ticket-types/:ticketTypeId", optionalAuthenticate, async (request, response, next) => {
  try { response.vary("Authorization"); const result = await listTicketTypes(String(request.params.eventId), roleOf(request) === "ORGANIZER"); const type = result.data.find((item: TicketTypeView) => item.id === request.params.ticketTypeId); if (!type) return next(new AppError(404, "ticket-type-not-found", "Tipe tiket tidak ditemukan.")); response.set("ETag", `"${type.version}"`).json({ data: type }); } catch (error) { next(error); }
});

router.patch("/:eventId/ticket-types/:ticketTypeId", authorize("ORGANIZER"), async (request, response, next) => {
  try { const type = await updateTicketType(String(request.params.eventId), String(request.params.ticketTypeId), request.get("if-match"), ticketTypePatch.parse(request.body)); response.set("ETag", `"${type.version}"`).json({ data: type }); } catch (error) { next(error); }
});

router.delete("/:eventId/ticket-types/:ticketTypeId", authorize("ORGANIZER"), async (request, response, next) => {
  try { await deleteTicketType(String(request.params.eventId), String(request.params.ticketTypeId), request.get("if-match")); response.status(204).send(); } catch (error) { next(error); }
});

const eventAccess = authorize("ORGANIZER", "STAFF");
const viewerOf = (request: unknown) => (request as AuthenticatedRequest).user as { sub: string; role: "ORGANIZER" | "STAFF" | "ATTENDEE" };
const auditOf = (request: import("express").Request) => ({ actorId: viewerOf(request).sub, actorRole: viewerOf(request).role, ip: request.ip, userAgent: request.get("user-agent") });
const ticketStatusList = z.string().transform((value) => value.split(",")).pipe(z.array(z.enum(["VALID", "CHECKED_IN", "VOID"])));
export const checkInBody = z.object({ code: z.string().min(1).max(64).optional(), ticketId: z.string().uuid().optional() }).strict()
  .refine((body) => (body.code === undefined) !== (body.ticketId === undefined), { message: "Kirim tepat satu dari code atau ticketId.", path: ["code"] });
export const checkInListQuery = z.object({
  result: z.string().transform((value) => value.split(",")).pipe(z.array(z.enum(["ACCEPTED", "ALREADY_CHECKED_IN", "TICKET_VOID", "WRONG_EVENT", "NOT_FOUND", "CHECK_IN_CLOSED"]))).optional(),
  method: z.enum(["QR", "MANUAL"]).optional(), scannedById: z.string().uuid().optional(), ticketId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50), cursor: z.string().optional(),
}).strict();
export const attendeeQuery = z.object({
  status: ticketStatusList.default(["VALID", "CHECKED_IN"]), ticketTypeId: z.string().uuid().optional(), q: z.string().trim().min(2).optional(),
  sort: z.enum(["holderName", "checkedInAt", "-checkedInAt", "ticketTypeName"]).default("holderName"),
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
const exportQuery = z.object({ format: z.enum(["csv", "xlsx"]), status: ticketStatusList.default(["VALID", "CHECKED_IN"]) }).strict();

router.post("/:eventId/check-ins", eventAccess, async (request, response, next) => {
  try { const eventId = String(request.params.eventId); const checkIn = await scanTicket(eventId, viewerOf(request), checkInBody.parse(request.body)); response.status(201).location(`/api/v1/events/${eventId}/check-ins/${checkIn.id}`).json({ data: checkIn }); } catch (error) { next(error); }
});

router.get("/:eventId/check-ins", eventAccess, async (request, response, next) => {
  try { response.json(await listCheckIns(String(request.params.eventId), viewerOf(request), checkInListQuery.parse(request.query))); } catch (error) { next(error); }
});

router.get("/:eventId/check-ins/:checkInId", eventAccess, async (request, response, next) => {
  try { response.json({ data: await getCheckIn(String(request.params.eventId), viewerOf(request), String(request.params.checkInId)) }); } catch (error) { next(error); }
});

router.post("/:eventId/check-ins/:checkInId/revert", authorize("ORGANIZER"), async (request, response, next) => {
  try { response.json({ data: await revertCheckIn(String(request.params.eventId), String(request.params.checkInId), cancelBody.parse(request.body).reason, auditOf(request)) }); } catch (error) { next(error); }
});

router.get("/:eventId/attendees", eventAccess, async (request, response, next) => {
  try { response.json(await listAttendees(String(request.params.eventId), viewerOf(request), attendeeQuery.parse(request.query))); } catch (error) { next(error); }
});

router.get("/:eventId/attendees/export", authorize("ORGANIZER"), async (request, response, next) => {
  try {
    const query = exportQuery.parse(request.query);
    if (query.format === "xlsx") throw new AppError(422, "validation-error", "Format xlsx belum didukung; gunakan csv.", { errors: [{ parameter: "format", detail: "Gunakan csv." }] });
    const file = await exportAttendeesCsv(String(request.params.eventId), viewerOf(request), query.status, auditOf(request));
    response.set("Content-Type", "text/csv; charset=utf-8").set("Content-Disposition", `attachment; filename="${file.filename}"`).send(file.body);
  } catch (error) { next(error); }
});

router.get("/:eventId", optionalAuthenticate, async (request, response, next) => {
  try { response.vary("Authorization"); const event = await getEvent(String(request.params.eventId), roleOf(request)); response.set("ETag", `"${event.version}"`).json({ data: event }); } catch (error) { next(error); }
});

export default router;