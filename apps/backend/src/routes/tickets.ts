import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { getTicket, listTickets, reissueTicket, updateHolderName } from "../services/ticket-service";

const router = Router();
const ticketStatus = z.enum(["VALID", "CHECKED_IN", "VOID"]);
export const ticketListQuery = z.object({
  eventId: z.string().uuid().optional(),
  status: z.string().transform((value) => value.split(",")).pipe(z.array(ticketStatus)).optional(),
  when: z.enum(["upcoming", "past", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
}).strict();
export const holderNameBody = z.object({ holderName: z.string().trim().min(2).max(100) }).strict();
export const reasonBody = z.object({ reason: z.string().trim().min(5).max(500) }).strict();
const userOf = (request: unknown) => (request as AuthenticatedRequest).user;

router.get("/", authorize("ATTENDEE"), async (request, response, next) => {
  try { response.json(await listTickets(userOf(request).sub, ticketListQuery.parse(request.query))); } catch (error) { next(error); }
});

router.get("/:ticketId", authorize("ATTENDEE"), async (request, response, next) => {
  try { const ticket = await getTicket(userOf(request).sub, String(request.params.ticketId)); response.set("ETag", `"${ticket.version}"`).json({ data: ticket }); } catch (error) { next(error); }
});

router.patch("/:ticketId", authorize("ATTENDEE"), async (request, response, next) => {
  try { const body = holderNameBody.parse(request.body); const ticket = await updateHolderName(userOf(request).sub, String(request.params.ticketId), request.get("if-match"), body.holderName); response.set("ETag", `"${ticket.version}"`).json({ data: ticket }); } catch (error) { next(error); }
});

router.post("/:ticketId/reissue", authorize("ORGANIZER"), async (request, response, next) => {
  try {
    const { reason } = reasonBody.parse(request.body ?? {});
    const attendee = await reissueTicket(String(request.params.ticketId), request.get("if-match"), reason, { actorId: userOf(request).sub, actorRole: userOf(request).role, ip: request.ip, userAgent: request.get("user-agent") });
    response.set("ETag", `"${attendee.version}"`).json({ data: attendee });
  } catch (error) { next(error); }
});

export default router;
