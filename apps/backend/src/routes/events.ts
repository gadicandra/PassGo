import { Router } from "express";
import { z } from "zod";
import { type AuthenticatedRequest } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  cancelEvent, createEvent, createTicketType, deleteEvent, deleteTicketType, getEvent, listEvents, listTicketTypes, publishEvent, updateEvent, updateTicketType,
} from "../services/event-service";
import type { EventInput, TicketTypeInput, TicketTypeView } from "../services/event-service";
import { AppError } from "../utils/app-error";
import { assignEventStaff, listEventStaff, removeEventStaff } from "../services/event-staff-service";

const router = Router();
const date = z.coerce.date();
const eventStatus = z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]);
const eventShape = z.object({
  title: z.string().trim().min(3).max(150), description: z.string().max(10000).default(""), venueName: z.string().trim().min(2).max(150), venueAddress: z.string().max(300).default(""), mapsUrl: z.string().url().nullable().default(null), startAt: date, endAt: date, timezone: z.string().max(40).default("Asia/Jakarta"), checkInOpensAt: date.nullable().default(null), capacity: z.number().int().min(1).max(100000).nullable().default(null), maxTicketsPerUser: z.number().int().min(1).max(100).nullable().default(null),
}).strict();
const eventBody = eventShape.superRefine((value, context) => { if (value.endAt <= value.startAt) context.addIssue({ code: "custom", path: ["endAt"], message: "endAt harus setelah startAt." }); });
const eventPatch = eventShape.partial().strict();
const cancelBody = z.object({ reason: z.string().trim().min(5).max(500) }).strict();
const ticketTypeBody = z.object({ name: z.string().trim().min(2).max(50), description: z.string().max(500).nullable().default(null), price: z.number().int().min(0), quota: z.number().int().min(1).max(100000), salesStartAt: date, salesEndAt: date, maxPerOrder: z.number().int().min(1).max(20).default(5), isActive: z.boolean().default(true), sortOrder: z.number().int().min(0).max(999).default(0) }).strict();
const ticketTypePatch = ticketTypeBody.partial().strict();

router.get("/", async (request, response, next) => {
  try { const query = z.object({ status: z.string().optional(), when: z.enum(["upcoming", "past", "all"]).default("upcoming"), q: z.string().min(2).optional() }).parse(request.query); const statuses = query.status?.split(",").map((value) => eventStatus.parse(value)); response.json(await listEvents({ status: statuses, when: query.when, q: query.q })); } catch (error) { next(error); }
});

router.get("/by-slug/:slug", async (request, response, next) => {
  try { response.json({ data: await getEvent(request.params.slug, undefined, true) }); } catch (error) { next(error); }
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

router.get("/:eventId/ticket-types", async (request, response, next) => {
  try { response.json(await listTicketTypes(request.params.eventId, false)); } catch (error) { next(error); }
});

router.post("/:eventId/ticket-types", authorize("ORGANIZER"), async (request, response, next) => {
  try { const type = await createTicketType(String(request.params.eventId), ticketTypeBody.parse(request.body) as TicketTypeInput); response.status(201).json({ data: type }); } catch (error) { next(error); }
});

router.get("/:eventId/ticket-types/:ticketTypeId", async (request, response, next) => {
  try { const result = await listTicketTypes(String(request.params.eventId), false); const type = result.data.find((item: TicketTypeView) => item.id === request.params.ticketTypeId); if (!type) return next(new AppError(404, "ticket-type-not-found", "Tipe tiket tidak ditemukan.")); response.set("ETag", `"${type.version}"`).json({ data: type }); } catch (error) { next(error); }
});

router.patch("/:eventId/ticket-types/:ticketTypeId", authorize("ORGANIZER"), async (request, response, next) => {
  try { const type = await updateTicketType(String(request.params.eventId), String(request.params.ticketTypeId), request.get("if-match"), ticketTypePatch.parse(request.body)); response.set("ETag", `"${type.version}"`).json({ data: type }); } catch (error) { next(error); }
});

router.delete("/:eventId/ticket-types/:ticketTypeId", authorize("ORGANIZER"), async (request, response, next) => {
  try { await deleteTicketType(String(request.params.eventId), String(request.params.ticketTypeId), request.get("if-match")); response.status(204).send(); } catch (error) { next(error); }
});

router.get("/:eventId", async (request, response, next) => {
  try { const event = await getEvent(request.params.eventId); response.set("ETag", `"${event.version}"`).json({ data: event }); } catch (error) { next(error); }
});

export default router;