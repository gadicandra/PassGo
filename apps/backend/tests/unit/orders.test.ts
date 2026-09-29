import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

test("POST /api/v1/orders requires authentication", async () => {
  const response = await request(app)
    .post("/api/v1/orders")
    .send({ eventId: "0192a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b", items: [] });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});