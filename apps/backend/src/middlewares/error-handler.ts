import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

const base = () => process.env.PROBLEM_TYPE_BASE ?? "about:blank";
const titleOf = (code: string) => {
  const t = code.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const notFoundHandler: RequestHandler = (request, response) => {
  response
    .status(404)
    .type("application/problem+json")
    .json({
      type: `${base()}#route-not-found`,
      title: "Route not found",
      status: 404,
      detail: `Route ${request.method} ${request.path} tidak ditemukan.`,
      code: "route-not-found",
    });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
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

  res
    .status(status)
    .type("application/problem+json")
    .json({
      type: `${base()}#${code}`,
      title: titleOf(code),
      status,
      detail,
      code,
      ...extra,
    });
};
