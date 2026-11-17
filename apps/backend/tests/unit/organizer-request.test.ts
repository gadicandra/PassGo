import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";
import { organizerRequestSchema } from "../../src/routes/me";
import { decisionSchema } from "../../src/routes/users";

test("pengajuan penyelenggara: tanpa login ditolak 401 (kontrak §9.15)", async () => {
  const submit = await request(app).post("/api/v1/me/organizer-request").send({ organization: "Komunitas Riso", reason: "x".repeat(30) });
  assert.equal(submit.status, 401);
  const list = await request(app).get("/api/v1/users/organizer-requests");
  assert.equal(list.status, 401);
  const approve = await request(app).post("/api/v1/users/01a1e77a-0000-7000-8000-000000000000/organizer-request/approve").send({});
  assert.equal(approve.status, 401);
});

test("pengajuan penyelenggara: validasi isian", () => {
  assert.ok(organizerRequestSchema.safeParse({ organization: "Komunitas Riso Yogya", reason: "Lokakarya cetak risograf bulanan untuk pemula." }).success);
  assert.ok(organizerRequestSchema.safeParse({ organization: "Riso", reason: "Lokakarya cetak risograf bulanan.", link: "https://instagram.com/riso" }).success);
  // alasan terlalu pendek, tautan bukan URL, dan field tak dikenal ditolak
  assert.equal(organizerRequestSchema.safeParse({ organization: "Riso", reason: "acara" }).success, false);
  assert.equal(organizerRequestSchema.safeParse({ organization: "Riso", reason: "Lokakarya cetak risograf bulanan.", link: "instagram riso" }).success, false);
  assert.equal(organizerRequestSchema.safeParse({ organization: "Riso", reason: "Lokakarya cetak risograf bulanan.", role: "ORGANIZER" }).success, false);
  assert.ok(decisionSchema.safeParse({}).success);
  assert.equal(decisionSchema.safeParse({ note: "x".repeat(301) }).success, false);
});
