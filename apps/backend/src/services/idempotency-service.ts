import { createHash } from "node:crypto";
import { IdempotencyKey } from "../models";
import { AppError } from "../utils/app-error";

type Replay = { status: number; body: unknown; headers: Record<string, string> };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

function requestHash(body: unknown): string {
  return createHash("sha256").update(canonical(body)).digest("hex");
}

function keyValue(value: string | undefined): string {
  const key = value?.replace(/^"|"$/g, "");
  if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new AppError(400, "idempotency-key-required", "Idempotency-Key wajib berupa UUID.");
  return key;
}

export async function runIdempotent<T>(input: {
  userId: string;
  method: string;
  path: string;
  keyHeader: string | undefined;
  body: unknown;
  handler: () => Promise<{ status: number; body: T; headers?: Record<string, string> }>;
}): Promise<Replay> {
  const key = keyValue(input.keyHeader);
  const hash = requestHash(input.body);
  const existing: any = await IdempotencyKey.findOne({ userId: input.userId, method: input.method, path: input.path, key }).lean();
  if (existing) {
    if (existing.requestHash !== hash) throw new AppError(422, "idempotency-key-reused", "Idempotency-Key sudah digunakan dengan body berbeda.");
    if (existing.state === "IN_PROGRESS") throw new AppError(409, "idempotency-in-progress", "Request dengan key yang sama sedang diproses.", { retryAfter: 1 });
    return { status: existing.responseStatus, body: existing.responseBody, headers: { ...(existing.responseHeaders ?? {}), "Idempotent-Replayed": "true" } };
  }

  try {
    await IdempotencyKey.create({ userId: input.userId, method: input.method, path: input.path, key, requestHash: hash, state: "IN_PROGRESS", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "idempotency-in-progress", "Request dengan key yang sama sedang diproses.", { retryAfter: 1 });
    throw error;
  }

  try {
    const result = await input.handler();
    const headers = result.headers ?? {};
    await IdempotencyKey.updateOne({ userId: input.userId, method: input.method, path: input.path, key }, { $set: { state: "COMPLETED", responseStatus: result.status, responseHeaders: headers, responseBody: result.body } });
    return { status: result.status, body: result.body, headers };
  } catch (error) {
    if (!(error instanceof AppError) || error.status >= 500) await IdempotencyKey.deleteOne({ userId: input.userId, method: input.method, path: input.path, key });
    throw error;
  }
}