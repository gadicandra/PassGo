import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middlewares/authorize";
import { createManagedUser, getUser, listUsers, updateManagedUser } from "../services/user-service";
import type { UserRole } from "../services/auth-repository";
import { type AuthenticatedRequest } from "../middlewares/authenticate";
import { AppError } from "../utils/app-error";

const router = Router();
const role = z.enum(["ORGANIZER", "STAFF", "ATTENDEE"]);
const createSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), phone: z.string().nullable().optional(), role: z.enum(["STAFF", "ORGANIZER"]), password: z.string().min(8).max(64) }).strict();
const updateSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), phone: z.string().nullable().optional(), role: role.optional(), isActive: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0, "Body tidak boleh kosong.");

router.use(authorize("ORGANIZER"));

router.get("/", async (request, response, next) => {
  try {
    const page = Number(request.query.page ?? 1);
    const pageSize = Number(request.query.pageSize ?? 20);
    const query = z.object({ role: role.optional(), isActive: z.enum(["true", "false"]).optional(), q: z.string().min(2).optional() }).parse(request.query);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new AppError(422, "validation-error", "Pagination tidak valid.");
    const result = await listUsers({ page, pageSize, role: query.role as UserRole | undefined, isActive: query.isActive === undefined ? undefined : query.isActive === "true", q: query.q });
    response.json(result);
  } catch (error) { next(error); }
});

router.post("/", async (request, response, next) => {
  try { const user = await createManagedUser(createSchema.parse(request.body)); response.status(201).location(`/api/v1/users/${user.id}`).json({ data: user }); } catch (error) { next(error); }
});

router.get("/:userId", async (request, response, next) => {
  try { const user = await getUser(request.params.userId); response.set("ETag", `"${user.version}"`).json({ data: user }); } catch (error) { next(error); }
});

router.patch("/:userId", async (request, response, next) => {
  try {
    const user = await updateManagedUser((request as unknown as AuthenticatedRequest).user.sub, request.params.userId, request.get("if-match"), updateSchema.parse(request.body));
    response.set("ETag", `"${user.version}"`).json({ data: user });
  } catch (error) { next(error); }
});

export default router;