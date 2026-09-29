import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";
import { allowedStatuses } from "../../src/services/event-service";

test("GET /api/v1/events tidak pernah membocorkan acara DRAFT ke non-organizer", () => {
  assert.deepEqual(allowedStatuses(["DRAFT"], undefined), []);
  assert.deepEqual(allowedStatuses(["DRAFT"], "ATTENDEE"), []);
  assert.deepEqual(allowedStatuses(["DRAFT"], "STAFF"), []);
  assert.deepEqual(allowedStatuses(undefined, "ATTENDEE"), ["PUBLISHED", "CANCELLED"]);
  assert.deepEqual(allowedStatuses(["DRAFT"], "ORGANIZER"), ["DRAFT"]);
});

test("GET /api/v1/events menolak status yang tidak dikenal", async () => {
  const response = await request(app).get("/api/v1/events?status=SECRET");

  assert.equal(response.status, 422);
  assert.equal(response.body.code, "validation-error");
});

test("Endpoint publik dengan token rusak tetap 401, bukan dilayani sebagai tamu", async () => {
  const response = await request(app).get("/api/v1/events").set("authorization", "Bearer rusak");

  assert.equal(response.status, 401);
});

test("POST /api/v1/events requires authentication", async () => {
  const response = await request(app).post("/api/v1/events").send({});

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});

test("POST /api/v1/events/:eventId/ticket-types requires authentication", async () => {
  const response = await request(app).post("/api/v1/events/event-id/ticket-types").send({});

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});
test("PATCH parsial tidak menimpa field yang tidak dikirim dengan default", async () => {
  const { eventPatch, ticketTypePatch } = await import("../../src/routes/events");

  assert.deepEqual(eventPatch.parse({ description: "baru" }), { description: "baru" });
  assert.deepEqual(ticketTypePatch.parse({ quota: 40 }), { quota: 40 });
});
