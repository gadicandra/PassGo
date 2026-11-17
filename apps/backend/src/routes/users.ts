import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middlewares/authorize";
import { createManagedUser, getUser, listUsers, updateManagedUser } from "../services/user-service";
import type { UserRole } from "../services/auth-repository";
import { type AuthenticatedRequest } from "../middlewares/authenticate";
import { AppError } from "../utils/app-error";
import { runIdempotent } from "../services/idempotency-service";
import type { AuditContext } from "../services/audit-service";
import { password, phone } from "../validators/user-fields";

const router = Router();
const role = z.enum(["ORGANIZER", "STAFF", "ATTENDEE"]);
const createSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), phone, role: z.enum(["STAFF", "ORGANIZER"]), password }).strict();
const updateSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), phone, role: role.optional(), isActive: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0, "Body tidak boleh kosong.");

router.use(authorize("ORGANIZER"));

const auditOf = (request: import("express").Request): AuditContext => {
  const user = (request as AuthenticatedRequest).user;
  return { actorId: user.sub, actorRole: user.role, ip: request.ip, userAgent: request.get("user-agent") };
};

router.get("/", async (request, response, next) => {
  try {
    const page = Number(request.query.page ?? 1);
    const pageSize = Number(request.query.pageSize ?? 20);
    const query = z.object({ role: role.optional(), isActive: z.enum(["true", "false"]).optional(), q: z.string().min(2).optional(), sort: z.enum(["name", "-name", "createdAt", "-createdAt"]).default("-createdAt") }).parse(request.query);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new AppError(422, "validation-error", "Pagination tidak valid.");
    const result = await listUsers({ page, pageSize, role: query.role as UserRole | undefined, isActive: query.isActive === undefined ? undefined : query.isActive === "true", q: query.q, sort: query.sort });
    response.json(result);
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try {
    const input = createSchema.parse(request.body);
    const result = await runIdempotent({ userId: (request as AuthenticatedRequest).user.sub, method: request.method, path: request.path, keyHeader: request.get("idempotency-key"), body: input, handler: async () => {
      const user = await createManagedUser(input, auditOf(request));
      return { status: 201, body: { data: user }, headers: { Location: `/api/v1/users/${user.id}` } };
    } });
    for (const [name, value] of Object.entries(result.headers)) response.set(name, value);
    response.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

router.get("/:userId", async (request, response, next) => {
  try { const user = await getUser(request.params.userId); response.set("ETag", `"${user.version}"`).json({ data: user }); } catch (error) { next(error); }
});

router.patch("/:userId", async (request, response, next) => {
  try {
    const user = await updateManagedUser(auditOf(request), request.params.userId, request.get("if-match"), updateSchema.parse(request.body));
    response.set("ETag", `"${user.version}"`).json({ data: user });
  } catch (error) { next(error); }
});

export default router;