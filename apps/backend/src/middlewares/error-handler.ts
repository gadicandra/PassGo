import type { ErrorRequestHandler, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { requestIdOf } from "./request-context";

const base = () => process.env.PROBLEM_TYPE_BASE ?? "about:blank";
const titleOf = (code: string) => {
  const t = code.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

interface RouterLayer {
  match(path: string): boolean;
  path?: string;
  route?: { methods: Record<string, boolean> };
  handle?: { stack?: RouterLayer[] };
}

// Express 5 tidak mengirim 405 sendiri (kontrak §3): telusuri stack router untuk method yang terdaftar pada path ini.
function allowedMethods(stack: RouterLayer[], path: string, found = new Set<string>()): Set<string> {
  for (const layer of stack) {
    if (!layer.match(path)) continue;
    if (layer.route) {
      for (const [method, enabled] of Object.entries(layer.route.methods)) if (enabled && method !== "_all") found.add(method.toUpperCase());
    } else if (layer.handle?.stack) {
      allowedMethods(layer.handle.stack, path.slice(layer.path?.length ?? 0) || "/", found);
    }
  }
  return found;
}

function sendProblem(request: Request, response: Response, status: number, code: string, detail: string, extra: Record<string, unknown> = {}): void {
  const requestId = requestIdOf(request);
  response
    .status(status)
    .type("application/problem+json")
    .json({
      type: `${base()}#${code}`,
      title: titleOf(code),
      status,
      detail,
      ...(requestId ? { instance: `urn:uuid:${requestId}` } : {}),
      code,
      ...(requestId ? { requestId } : {}),
      ...extra,
    });
}

export const notFoundHandler: RequestHandler = (request, response) => {
  const stack = (request.app as unknown as { router?: { stack: RouterLayer[] } }).router?.stack ?? [];
  const allowed = allowedMethods(stack, request.path);
  if (allowed.size) {
    if (allowed.has("GET")) allowed.add("HEAD");
    response.set("Allow", [...allowed].sort().join(", "));
    sendProblem(request, response, 405, "method-not-allowed", `Method ${request.method} tidak didukung pada ${request.path}.`);
    return;
  }
  sendProblem(request, response, 404, "route-not-found", `Route ${request.method} ${request.path} tidak ditemukan.`);
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  let status = 500;
  let code = "internal-error";
  let detail = "Terjadi kesalahan internal.";
  let extra: Record<string, unknown> = {};

  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    detail = error.message;
    extra = error.extra;
  } else if (error instanceof ZodError) {
    status = 422;
    code = "validation-error";
    detail = "Validasi input gagal.";
    extra = {
      errors: error.issues.map((i) => ({
        pointer: `#/${i.path.join("/")}`,
        detail: i.message,
      })),
    };
  } else if (error?.type === "entity.parse.failed") {
    status = 400;
    code = "malformed-request";
    detail = "Body JSON tidak valid.";
  } else if (error?.type === "entity.too.large") {
    status = 413;
    code = "payload-too-large";
    detail = "Body terlalu besar.";
  } else {
    console.error(error);
    if (process.env.NODE_ENV !== "production")
      detail = error?.message ?? detail;
  }

  if (status === 401) {
    // RFC 6750 §3: error="invalid_token" hanya bila token dikirim tapi ditolak.
    const rejected = code === "token-expired" || code === "token-invalid" || code === "token-revoked";
    response.set("WWW-Authenticate", rejected ? `Bearer realm="passgo", error="invalid_token", error_description="${code === "token-expired" ? "token expired" : detail.replace(/"/g, "'")}"` : 'Bearer realm="passgo"');
  }
  sendProblem(request, response, status, code, detail, extra);
};
