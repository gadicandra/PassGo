import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

test("GET /api/v1/events/:eventId/staff requires authentication", async () => {
  const response = await request(app).get("/api/v1/events/event-id/staff");

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});

test("PUT /api/v1/events/:eventId/staff/:userId requires authentication", async () => {
  const response = await request(app).put("/api/v1/events/event-id/staff/user-id");

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});