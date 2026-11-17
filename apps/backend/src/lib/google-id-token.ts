import { createPublicKey, type JsonWebKeyInput, type KeyObject } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/app-error";

// Verifikasi ID token dari tombol "Lanjutkan dengan Google" (Google Identity Services).
// Kunci publik Google diambil dari JWKS dan di-cache sesuai Cache-Control, tanpa library tambahan.
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS: [string, string] = ["accounts.google.com", "https://accounts.google.com"];

let cache: { keys: Map<string, KeyObject>; expiresAt: number } | null = null;

async function googleKeys(force = false): Promise<Map<string, KeyObject>> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.keys;
  let response: Response;
  try {
    response = await fetch(CERTS_URL);
  } catch {
    throw new AppError(502, "google-unavailable", "Google sedang tidak bisa dihubungi. Coba lagi.");
  }
  if (!response.ok) throw new AppError(502, "google-unavailable", "Google sedang tidak bisa dihubungi. Coba lagi.");
  const body = (await response.json()) as { keys: Array<JsonWebKeyInput["key"] & { kid: string }> };
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  cache = {
    keys: new Map(body.keys.map((key) => [key.kid, createPublicKey({ key, format: "jwk" })])),
    expiresAt: Date.now() + maxAge * 1000,
  };
  return cache.keys;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

const invalid = () => new AppError(401, "google-token-invalid", "Login Google gagal. Coba lagi.");

/** Tanda tangan, audience (Client ID kita), issuer, dan masa berlaku dicek. Lempar 401 bila tidak valid. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError(503, "google-login-disabled", "Login dengan Google belum diaktifkan.");

  const kid = jwt.decode(idToken, { complete: true })?.header.kid;
  if (!kid) throw invalid();
  // Kunci baru dirotasi Google: kid belum dikenal → ambil ulang JWKS sekali.
  const key = (await googleKeys()).get(kid) ?? (await googleKeys(true)).get(kid);
  if (!key) throw invalid();

  let payload: JwtPayload;
  try {
    payload = jwt.verify(idToken, key, { algorithms: ["RS256"], audience: clientId, issuer: ISSUERS }) as JwtPayload;
  } catch {
    throw invalid();
  }
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw invalid();
  return {
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : payload.email.split("@")[0],
  };
}
