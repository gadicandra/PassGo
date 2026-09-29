import jwt from "jsonwebtoken";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyAccessToken, type AccessTokenClaims } from "../lib/auth-tokens";
import { getUserById } from "../services/auth-service";
import { AppError } from "../utils/app-error";

export type AuthenticatedRequest = Request & { user: AccessTokenClaims };

export async function authenticate(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const header = request.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "unauthenticated", "Bearer token diperlukan.");
    }
    const claims = verifyAccessToken(header.slice(7));
    const user = await getUserById(claims.sub);
    if (!user || !user.isActive || user.tokenVersion !== claims.ver) {
      throw new AppError(401, "token-revoked", "Token sudah dicabut.");
    }
    (request as AuthenticatedRequest).user = claims;
    next();
  } catch (error) {
    if (error instanceof AppError) next(error);
    else if (error instanceof jwt.TokenExpiredError) next(new AppError(401, "token-expired", "Access token kedaluwarsa."));
    else next(new AppError(401, "token-invalid", "Access token tidak valid."));
  }
}

export const optionalAuthenticate: RequestHandler = (request, response, next) => {
  if (!request.header("authorization")) {
    next();
    return;
  }
  void authenticate(request, response, next);
};

export const roleOf = (request: Request): AccessTokenClaims["role"] | undefined =>
  (request as Partial<AuthenticatedRequest>).user?.role;