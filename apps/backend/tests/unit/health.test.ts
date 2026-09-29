import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

test("GET /api/v1/health returns the liveness response", async () => {
  const response = await request(app).get("/api/v1/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    data: {
      status: "ok",
    },
  });
});

test("GET /api/v1/health/ready reports unavailable when MongoDB is disconnected", async () => {
  const response = await request(app).get("/api/v1/health/ready");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, {
    data: {
      status: "unavailable",
      checks: {
        database: "unavailable",
      },
    },
  });
});