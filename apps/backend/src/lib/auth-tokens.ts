import { createHash, randomBytes } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

export type AccessTokenClaims = JwtPayload & {
  sub: string;
  role: "ORGANIZER" | "STAFF" | "ATTENDEE";
  ver: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function ttlToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return Number(match[1]) * multipliers[match[2] as keyof typeof multipliers];
}

export function createAccessToken(user: { id: string; role: AccessTokenClaims["role"]; tokenVersion: number }): string {
  const expiresIn = process.env.JWT_ACCESS_TTL ?? "15m";
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: ttlToSeconds(expiresIn),
    issuer: process.env.JWT_ISSUER ?? "passgo-api",
    audience: process.env.JWT_AUDIENCE ?? "passgo",
    header: { alg: "HS256", typ: "at+jwt" },
  };

  return jwt.sign(
    { sub: user.id, role: user.role, ver: user.tokenVersion, jti: randomBytes(16).toString("hex") },
    requiredEnv("JWT_ACCESS_SECRET"),
    options,
  );
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, requiredEnv("JWT_ACCESS_SECRET"), {
    algorithms: ["HS256"],
    issuer: process.env.JWT_ISSUER ?? "passgo-api",
    audience: process.env.JWT_AUDIENCE ?? "passgo",
    complete: true,
  });

  if (typeof decoded === "string" || decoded.header.typ !== "at+jwt") {
    throw new Error("Invalid access token type");
  }

  return decoded.payload as AccessTokenClaims;
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function durationFromEnv(name: string, fallback: string): number {
  return ttlToSeconds(process.env[name] ?? fallback) * 1000;
}