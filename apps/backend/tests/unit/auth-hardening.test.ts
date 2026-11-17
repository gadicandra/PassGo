import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";
import { normalizePhone } from "../../src/validators/user-fields";

test("normalizePhone: format lokal/62/+62 → +62, nomor asing atau pendek ditolak", () => {
  assert.equal(normalizePhone("0812-3456 7890"), "+6281234567890");
  assert.equal(normalizePhone("6281234567890"), "+6281234567890");
  assert.equal(normalizePhone("+6281234567890"), "+6281234567890");
  assert.equal(normalizePhone("+14155550123"), null);
  assert.equal(normalizePhone("0812"), null);
  assert.equal(normalizePhone("abc"), null);
});

test("register menolak phone non-Indonesia dan password > 72 byte (sebelum menyentuh DB)", async () => {
  const badPhone = await request(app).post("/api/v1/auth/register")
    .send({ name: "Rina", email: "rina@example.com", phone: "+14155550123", password: "password123" });
  assert.equal(badPhone.status, 422);
  assert.ok(badPhone.body.errors.some((e: { pointer: string }) => e.pointer === "#/phone"));

  // 25 emoji = 50 code unit (lolos max 64 karakter) tapi 100 byte UTF-8 (> 72, batas bcrypt).
  const longBytes = await request(app).post("/api/v1/auth/register")
    .send({ name: "Rina", email: "rina@example.com", password: "😀".repeat(25) });
  assert.equal(longBytes.status, 422);
  assert.ok(longBytes.body.errors.some((e: { pointer: string }) => e.pointer === "#/password"));
});

test("login: percobaan ke-6 untuk email+IP yang sama → 429 problem+json dengan Retry-After dan header draft-8", async () => {
  // password kosong → 422 dari schema tanpa menyentuh DB; limiter berjalan sebelum schema, jadi tetap dihitung.
  const attempt = () => request(app).post("/api/v1/auth/login").send({ email: "brute@example.com", password: "" });
  for (let i = 0; i < 5; i++) await attempt();
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, "rate-limited");
  assert.match(blocked.headers["content-type"], /problem\+json/);
  assert.ok(Number(blocked.headers["retry-after"]) > 0);
  assert.match(blocked.headers["ratelimit-policy"], /"login"; ?q=5; ?w=900/);
});

test("stripPort: XFF Azure 'ip:port' → ip, IPv6 berkurung → tanpa kurung, IPv6 polos tetap", async () => {
  const { stripPort } = await import("../../src/app");
  assert.equal(stripPort("203.0.113.7:51234"), "203.0.113.7");
  assert.equal(stripPort(" 203.0.113.7 "), "203.0.113.7");
  assert.equal(stripPort("[2001:db8::1]:443"), "2001:db8::1");
  assert.equal(stripPort("2001:db8::1"), "2001:db8::1");
});

test("rate limit memakai IP klien dari XFF ber-port: dua port beda dihitung satu klien", async () => {
  const hit = (port: number) => request(app).post("/api/v1/auth/login").set("X-Forwarded-For", `198.51.100.9:${port}`).send({ email: "port@example.com", password: "" });
  for (let i = 0; i < 5; i++) await hit(40000 + i);
  assert.equal((await hit(49999)).status, 429);
});

test("pesan validasi 422 berbahasa Indonesia (form FE menampilkannya apa adanya)", async () => {
  const response = await request(app).post("/api/v1/auth/register").send({ name: "Q", email: "bukan-email", password: "pendek" });
  assert.equal(response.status, 422);
  const byField = Object.fromEntries(response.body.errors.map((e: { pointer: string; detail: string }) => [e.pointer, e.detail]));
  assert.equal(byField["#/name"], "Minimal 2 karakter.");
  assert.equal(byField["#/email"], "Format email tidak valid.");
  assert.equal(byField["#/password"], "Minimal 8 karakter.");
});
