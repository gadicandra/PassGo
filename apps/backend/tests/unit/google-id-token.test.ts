import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { verifyGoogleIdToken } from "../../src/lib/google-id-token";

// JWKS palsu: fetch ke endpoint sertifikat Google dijawab dengan kunci publik uji ini.
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "uji-1", alg: "RS256", use: "sig" };
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json", "cache-control": "max-age=60" } })) as typeof fetch;

process.env.GOOGLE_CLIENT_ID = "client-uji.apps.googleusercontent.com";
const sign = (claims: Record<string, unknown>, options: { key?: typeof privateKey; kid?: string } = {}) =>
  jwt.sign({ sub: "123", email: "Budi@Example.com", email_verified: true, name: "Budi", ...claims }, options.key ?? privateKey, {
    algorithm: "RS256",
    keyid: options.kid ?? "uji-1",
    audience: process.env.GOOGLE_CLIENT_ID,
    issuer: "https://accounts.google.com",
    expiresIn: 300,
  });

test("verifyGoogleIdToken: token sah → profil dengan email huruf kecil", async () => {
  const profile = await verifyGoogleIdToken(sign({}));
  assert.deepEqual(profile, { sub: "123", email: "budi@example.com", emailVerified: true, name: "Budi" });
});

test("verifyGoogleIdToken: audience, issuer, kunci, atau tanda tangan salah → 401 google-token-invalid", async () => {
  const bad = [
    jwt.sign({ sub: "1", email: "a@b.co" }, privateKey, { algorithm: "RS256", keyid: "uji-1", audience: "client-lain", issuer: "https://accounts.google.com" }),
    jwt.sign({ sub: "1", email: "a@b.co" }, privateKey, { algorithm: "RS256", keyid: "uji-1", audience: process.env.GOOGLE_CLIENT_ID, issuer: "https://evil.example" }),
    sign({}, { kid: "tidak-ada" }),
    sign({}, { key: other.privateKey }),
    "bukan-jwt",
  ];
  for (const token of bad) {
    await assert.rejects(verifyGoogleIdToken(token), (error: { code?: string; status?: number }) => error.code === "google-token-invalid" && error.status === 401);
  }
});

test("verifyGoogleIdToken: tanpa GOOGLE_CLIENT_ID → 503 google-login-disabled", async () => {
  const saved = process.env.GOOGLE_CLIENT_ID;
  const token = sign({});
  delete process.env.GOOGLE_CLIENT_ID;
  try {
    await assert.rejects(verifyGoogleIdToken(token), (error: { code?: string }) => error.code === "google-login-disabled");
  } finally {
    process.env.GOOGLE_CLIENT_ID = saved;
  }
});
