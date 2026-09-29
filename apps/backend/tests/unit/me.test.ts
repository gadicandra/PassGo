import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";

const protectedRoutes = [
  ["GET", "/api/v1/me"],
  ["PATCH", "/api/v1/me"],
  ["POST", "/api/v1/me/password"],
  ["GET", "/api/v1/me/assigned-events"],
] as const;

for (const [method, path] of protectedRoutes) {
  test(`${method} ${path} requires authentication`, async () => {
    const response = method === "GET"
      ? await request(app).get(path)
      : method === "PATCH"
        ? await request(app).patch(path).send({})
        : await request(app).post(path).send({});

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "unauthenticated");
  });
}