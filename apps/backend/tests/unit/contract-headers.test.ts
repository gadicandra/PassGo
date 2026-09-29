import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../src/app";

test("setiap response membawa X-Request-Id; id klien valid dipakai ulang, yang tidak valid diganti", async () => {
  const echoed = await request(app).get("/api/v1/health").set("X-Request-Id", "abc-123");
  assert.equal(echoed.headers["x-request-id"], "abc-123");
  const replaced = await request(app).get("/api/v1/health").set("X-Request-Id", "bad id;drop");
  assert.match(replaced.headers["x-request-id"], /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
});

test("problem+json memuat instance dan requestId", async () => {
  const response = await request(app).get("/api/v1/nope").set("X-Request-Id", "req-1");
  assert.equal(response.status, 404);
  assert.equal(response.body.requestId, "req-1");
  assert.equal(response.body.instance, "urn:uuid:req-1");
});

test("method tidak didukung pada route yang ada → 405 + Allow", async () => {
  const response = await request(app).delete("/api/v1/health");
  assert.equal(response.status, 405);
  assert.equal(response.body.code, "method-not-allowed");
  assert.match(response.headers.allow, /GET/);
});

test("401 selalu membawa WWW-Authenticate; token rusak → invalid_token", async () => {
  const missing = await request(app).get("/api/v1/orders");
  assert.equal(missing.status, 401);
  assert.equal(missing.headers["www-authenticate"], 'Bearer realm="passgo"');
  assert.equal(missing.headers["cache-control"], undefined);

  const broken = await request(app).get("/api/v1/orders").set("Authorization", "Bearer rusak");
  assert.equal(broken.body.code, "token-invalid");
  assert.match(broken.headers["www-authenticate"], /error="invalid_token"/);
  assert.equal(broken.headers["cache-control"], "no-store");
});

test("access token kedaluwarsa → token-expired, bukan token-invalid", async () => {
  process.env.JWT_ACCESS_SECRET ??= "test-secret";
  const token = jwt.sign({ sub: "u1", role: "ATTENDEE", ver: 0 }, process.env.JWT_ACCESS_SECRET, {
    algorithm: "HS256", header: { alg: "HS256", typ: "at+jwt" }, issuer: process.env.JWT_ISSUER ?? "passgo-api",
    audience: process.env.JWT_AUDIENCE ?? "passgo", expiresIn: -10,
  });
  const response = await request(app).get("/api/v1/orders").set("Authorization", `Bearer ${token}`);
  assert.equal(response.status, 401);
  assert.equal(response.body.code, "token-expired");
  assert.match(response.headers["www-authenticate"], /error_description="token expired"/);
});
