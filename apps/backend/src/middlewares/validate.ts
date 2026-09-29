import type { RequestHandler } from "express";
import type { ZodType } from "zod";

// Pakai z.strictObject({...}) di schema agar field tak dikenal ditolak 422
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
