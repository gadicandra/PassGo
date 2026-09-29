import type { Request, RequestHandler } from "express";
import { uuidv7 } from "../utils/uuid";

const clientRequestId = /^[A-Za-z0-9-]{1,64}$/;

export const requestIdOf = (request: Request): string => (request as Request & { id?: string }).id ?? "";

// Kontrak §2: X-Request-Id dari klien diterima hanya bila aman untuk log; selain itu dibuat UUID v7 baru.
export const requestContext: RequestHandler = (request, response, next) => {
  const incoming = request.header("x-request-id");
  const id = incoming && clientRequestId.test(incoming) ? incoming : uuidv7();
  (request as Request & { id?: string }).id = id;
  response.set("X-Request-Id", id);
  // §2: no-store untuk response ber-Authorization; katalog publik meng-override sendiri.
  if (request.header("authorization")) response.set("Cache-Control", "no-store");
  next();
};
