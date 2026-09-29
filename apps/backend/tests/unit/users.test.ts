import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

test("GET /api/v1/users requires authentication", async () => {
  const response = await request(app).get("/api/v1/users");

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});

test("POST /api/v1/users requires authentication", async () => {
  const response = await request(app).post("/api/v1/users").send({
    name: "Staff User",
    email: "staff@example.com",
    password: "password123",
    role: "STAFF",
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "unauthenticated");
});