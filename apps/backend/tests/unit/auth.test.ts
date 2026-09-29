import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

test("POST /api/v1/auth/register rejects unknown fields", async () => {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Rina", email: "rina@example.com", password: "password123", role: "ORGANIZER" });

  assert.equal(response.status, 422);
  assert.equal(response.body.code, "validation-error");
});

test("POST /api/v1/auth/refresh requires the CSRF headers", async () => {
  const response = await request(app).post("/api/v1/auth/refresh");

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "csrf-check-failed");
});

test("POST /api/v1/auth/password-reset rejects an invalid email shape", async () => {
  const response = await request(app)
    .post("/api/v1/auth/password-reset")
    .send({ email: "not-an-email" });

  assert.equal(response.status, 422);
  assert.equal(response.body.code, "validation-error");
});