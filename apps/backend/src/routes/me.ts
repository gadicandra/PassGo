import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { changePassword, assignedEvents, getMe, updateMe } from "../services/me-service";
import { serializeUser, revokeAllSessions } from "../services/auth-service";

const router = Router();
const profileSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), phone: z.string().nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0, "Body tidak boleh kosong.");
const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(64) }).strict();
const refreshCookie = "__Secure-refresh_token";

router.use(authenticate);

router.get("/", async (request, response, next) => {
  try { const user = await getMe((request as AuthenticatedRequest).user.sub); response.set("ETag", `"${user.version}"`).json({ data: serializeUser(user) }); } catch (error) { next(error); }
});

router.patch("/", async (request, response, next) => {
  try { const user = await updateMe((request as AuthenticatedRequest).user.sub, request.get("if-match"), profileSchema.parse(request.body)); response.set("ETag", `"${user.version}"`).json({ data: serializeUser(user) }); } catch (error) { next(error); }
});

router.post("/password", async (request, response, next) => {
  try {
    const body = passwordSchema.parse(request.body);
    const result = await changePassword((request as AuthenticatedRequest).user.sub, body.currentPassword, body.newPassword);
    response.cookie(refreshCookie, result.refreshToken, { httpOnly: true, secure: true, sameSite: "strict", path: "/api/v1/auth", maxAge: 7 * 24 * 60 * 60 * 1000 });
    response.json({ data: { accessToken: result.accessToken, tokenType: "Bearer", expiresIn: 900, user: serializeUser(result.user) } });
  } catch (error) { next(error); }
});

router.get("/assigned-events", async (request, response, next) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    const when = z.enum(["upcoming", "past", "all"]).default("upcoming").parse(request.query.when);
    response.json({ data: user.role === "STAFF" ? await assignedEvents(user.sub, when) : [] });
  } catch (error) { next(error); }
});

export default router;