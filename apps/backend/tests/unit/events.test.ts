import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

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