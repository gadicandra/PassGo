import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { AuthenticatedRequest } from "./authenticate";
import { AppError } from "../utils/app-error";

// Kontrak §7. Header draft-8 dengan nama policy; 429 lewat errorHandler agar tetap problem+json.
// ponytail: MemoryStore per proses. Di Vercel tiap instance fungsi punya hitungan sendiri, jadi limit efektif
// bisa lebih longgar saat traffic tinggi. Upgrade: store bersama (rate-limit-mongo / Redis) bila perlu.
// RATE_LIMIT_DISABLED=true hanya untuk menjalankan Postman/test berulang di lokal; jangan diset di produksi.

const ip = (request: Request) => ipKeyGenerator(request.ip ?? "");
const email = (request: Request) => String((request.body as { email?: unknown } | undefined)?.email ?? "").trim().toLowerCase();
const userId = (request: Request) => (request as AuthenticatedRequest).user?.sub ?? ip(request);

function policy(name: string, limit: number, windowMs: number, key: (request: Request) => string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    identifier: name,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (request) => `${name}:${key(request)}`,
    skip: () => process.env.RATE_LIMIT_DISABLED === "true",
    handler: (request, _response, next, options) => {
      const reset = (request as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
      const retryAfter = reset ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000)) : Math.ceil(options.windowMs / 1000);
      next(new AppError(429, "rate-limited", "Terlalu banyak percobaan. Coba lagi nanti.", { retryAfter }));
    },
  });
}

const MIN = 60_000;
export const limits = {
  login: [policy("login", 5, 15 * MIN, (r) => `${ip(r)}|${email(r)}`), policy("login-ip", 20, 15 * MIN, ip)],
  register: policy("register", 5, 60 * MIN, ip),
  authEmail: policy("auth-email", 3, 60 * MIN, (r) => `${ip(r)}|${email(r) || userId(r)}`),
  authConfirm: policy("auth-confirm", 10, 15 * MIN, ip),
  passwordChange: policy("password-change", 5, 15 * MIN, userId),
  refresh: policy("refresh", 30, MIN, ip),
};
