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
  // Edge Vercel mengevaluasi ulang If-Match terhadap ETag response: write sukses (ETag = versi baru) diganti
  // 412 PRECONDITION_FAILED polosan padahal perubahan sudah tersimpan. Jadi request ber-If-Match tidak pernah
  // menerima ETag; versi baru tetap ada di body (`version`, §1.2/§6), dan 412 kami lolos utuh sebagai problem+json.
  if (request.header("if-match") !== undefined) {
    const setHeader = response.setHeader.bind(response);
    response.setHeader = (name, value) => (name.toLowerCase() === "etag" ? response : setHeader(name, value));
  }
  next();
};
