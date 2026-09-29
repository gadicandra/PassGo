import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middlewares/authorize";
import { listAuditLogs } from "../services/report-service";

const router = Router();
export const auditLogQuery = z.object({
  eventId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().transform((value) => value.split(",")).pipe(z.array(z.string().regex(/^[A-Z_]+$/))).optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  to: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
}).strict();

router.get("/", authorize("ORGANIZER"), async (request, response, next) => {
  try { response.json(await listAuditLogs(auditLogQuery.parse(request.query))); } catch (error) { next(error); }
});

export default router;
