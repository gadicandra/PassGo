import { Router, type RequestHandler } from "express";
import cookieParser from "cookie-parser";
import { z } from "zod";
import {
  confirmPasswordReset,
  getUserById,
  issueRefreshToken,
  login,
  refreshSession,
  register,
  requestPasswordReset,
  resendVerification,
  revokeAllSessions,
  revokeRefreshToken,
  verifyEmail,
} from "../services/auth-service";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { AppError } from "../utils/app-error";

const router = Router();
const refreshCookie = "__Secure-refresh_token";
const userAgent = (request: Parameters<RequestHandler>[0]) => request.get("user-agent") ?? undefined;
const setRefreshCookie = (response: Parameters<RequestHandler>[1], token: string) => response.cookie(refreshCookie, token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
const clearRefreshCookie = (response: Parameters<RequestHandler>[1]) => response.clearCookie(refreshCookie, { httpOnly: true, secure: true, sameSite: "strict", path: "/api/v1/auth" });

const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), phone: z.string().nullable().optional(), password: z.string().min(8).max(64) }).strict();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) }).strict();
const resetSchema = z.object({ token: z.string().min(1), newPassword: z.string().min(8).max(64) }).strict();
const cookieAuthGuard: RequestHandler = (request, _response, next) => {
  const allowedOrigins = process.env.CSRF_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()) ?? [];
  if (!request.get("origin") || !allowedOrigins.includes(request.get("origin") ?? "") || request.get("x-requested-with") !== "fetch") {
    next(new AppError(403, "csrf-check-failed", "CSRF check gagal."));
    return;
  }
  next();
};

router.use(cookieParser());

router.post("/register", async (request, response, next) => {
  try {
    await register(registerSchema.parse(request.body));
    response.status(202).json({ data: { message: "Cek email untuk verifikasi akun." } });
  } catch (error) { next(error); }
});

router.post("/login", async (request, response, next) => {
  try {
    const result = await login(loginSchema.parse(request.body));
    const user = await getUserById(result.user.id);
    if (!user) throw new AppError(401, "invalid-credentials", "Email atau password tidak valid.");
    setRefreshCookie(response, await issueRefreshToken(user, { userAgent: userAgent(request), ip: request.ip }));
    response.json({ data: { accessToken: result.accessToken, tokenType: "Bearer", expiresIn: 900, user: result.user } });
  } catch (error) { next(error); }
});

router.post("/refresh", cookieAuthGuard, async (request, response, next) => {
  try {
    const token = request.cookies[refreshCookie];
    if (!token) throw new AppError(401, "refresh-token-invalid", "Refresh token tidak valid.");
    const result = await refreshSession(token, { userAgent: userAgent(request), ip: request.ip });
    setRefreshCookie(response, result.refreshToken);
    response.json({ data: { accessToken: result.accessToken, tokenType: "Bearer", expiresIn: 900, user: result.user } });
  } catch (error) { next(error); }
});

router.post("/logout", cookieAuthGuard, async (request, response, next) => {
  try { if (request.cookies[refreshCookie]) await revokeRefreshToken(request.cookies[refreshCookie]); clearRefreshCookie(response); response.status(204).send(); } catch (error) { next(error); }
});

router.post("/logout-all", authenticate, async (request, response, next) => {
  try { await revokeAllSessions((request as AuthenticatedRequest).user.sub); clearRefreshCookie(response); response.status(204).send(); } catch (error) { next(error); }
});

router.post("/email-verification", authenticate, async (request, response, next) => {
  try { await resendVerification((request as AuthenticatedRequest).user.sub); response.status(202).json({ data: { message: "Cek email untuk verifikasi akun." } }); } catch (error) { next(error); }
});

router.post("/email-verification/confirm", async (request, response, next) => {
  try { await verifyEmail(z.object({ token: z.string().min(1) }).parse(request.body).token); response.status(204).send(); } catch (error) { next(error); }
});

router.post("/password-reset", async (request, response, next) => {
  try { await requestPasswordReset(z.object({ email: z.string().email() }).parse(request.body).email); response.status(202).json({ data: { message: "Cek email untuk reset password." } }); } catch (error) { next(error); }
});

router.post("/password-reset/confirm", async (request, response, next) => {
  try { const body = resetSchema.parse(request.body); await confirmPasswordReset(body.token, body.newPassword); response.status(204).send(); } catch (error) { next(error); }
});

export default router;