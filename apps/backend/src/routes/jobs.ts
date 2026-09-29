import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { processEmailOutbox } from "../services/email-service";
import { expireDueOrders } from "../services/order-expiry-service";

const router = Router();

// Vercel Cron mengirim `Authorization: Bearer $CRON_SECRET` (GET); scheduler eksternal boleh GET/POST.
// Hash dulu agar timingSafeEqual tidak bocor lewat perbedaan panjang.
const requireCronSecret: RequestHandler = (request, _response, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return next(new AppError(503, "jobs-disabled", "CRON_SECRET belum dikonfigurasi."));
  const given = /^Bearer (.+)$/.exec(request.get("authorization") ?? "")?.[1] ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(given), digest(secret))) return next(new AppError(401, "unauthenticated", "Secret job tidak valid."));
  next();
};

const jobs: Record<string, () => Promise<unknown>> = {
  "send-emails": () => processEmailOutbox(Number(process.env.EMAIL_BATCH_SIZE ?? 20) || 20),
  "expire-pending-orders": () => expireDueOrders(),
};

router.all("/:job", requireCronSecret, async (request, response, next) => {
  if (request.method !== "GET" && request.method !== "POST") return next();
  const job = jobs[String(request.params.job)];
  if (!job) return next(new AppError(404, "job-not-found", `Job ${request.params.job} tidak dikenal.`));
  try {
    const startedAt = Date.now();
    const result = await job();
    response.set("Cache-Control", "no-store").json({ data: { job: request.params.job, durationMs: Date.now() - startedAt, result } });
  } catch (error) { next(error); }
});

export default router;
