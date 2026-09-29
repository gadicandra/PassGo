import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";
import { authenticate, type AuthenticatedRequest } from "./authenticate";

export function authorize(...roles: Array<AuthenticatedRequest["user"]["role"]>) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    await authenticate(request, response, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      const user = (request as AuthenticatedRequest).user;
      if (!roles.includes(user.role)) {
        next(new AppError(403, "forbidden", "Peran tidak berwenang."));
        return;
      }
      next();
    });
  };
}