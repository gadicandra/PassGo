import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";
import { retryDelayMs } from "../../src/services/email-service";
import { renderEmail } from "../../src/services/email-templates";

const UUID = "0192a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) value === undefined ? delete process.env[key] : (process.env[key] = value);
  try { return await run(); } finally {
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : (process.env[key] = value);
  }
}

test("jobs: CRON_SECRET kosong → 503 jobs-disabled", () =>
  withEnv({ CRON_SECRET: undefined }, async () => {
    const response = await request(app).get("/api/v1/internal/jobs/send-emails");
    assert.equal(response.status, 503);
    assert.equal(response.body.code, "jobs-disabled");
  }));

test("jobs: tanpa/ salah Bearer → 401, job tak dikenal → 404", () =>
  withEnv({ CRON_SECRET: "s3cret" }, async () => {
    for (const header of [undefined, "Bearer wrong", "s3cret"]) {
      const call = request(app).post("/api/v1/internal/jobs/expire-pending-orders");
      const response = await (header ? call.set("Authorization", header) : call);
      assert.equal(response.status, 401, String(header));
      assert.equal(response.body.code, "unauthenticated");
    }
    const unknown = await request(app).get("/api/v1/internal/jobs/nope").set("Authorization", "Bearer s3cret");
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.code, "job-not-found");
  }));

test("POST /orders/:orderId/ticket-email tanpa token → 401", async () => {
  const response = await request(app).post(`/api/v1/orders/${UUID}/ticket-email`);
  assert.equal(response.status, 401);
});

test("retryDelayMs: backoff eksponensial 1, 2, 4, 8 menit", () => {
  assert.deepEqual([1, 2, 3, 4].map(retryDelayMs), [60_000, 120_000, 240_000, 480_000]);
});

test("renderEmail: tautan token memakai FRONTEND_URL dan di-encode", () =>
  withEnv({ FRONTEND_URL: "https://app.passgo.test/" }, async () => {
    const row = { id: UUID, to: "a@b.test", orderId: null, payload: { token: "a+b/c" } };
    const verify = await renderEmail({ ...row, type: "EMAIL_VERIFICATION" });
    assert.match(verify.text, /https:\/\/app\.passgo\.test\/verify-email\?token=a%2Bb%2Fc/);
    assert.match(verify.html, /verify-email\?token=a%2Bb%2Fc/);
    const reset = await renderEmail({ ...row, type: "PASSWORD_RESET" });
    assert.match(reset.text, /\/reset-password\?token=a%2Bb%2Fc/);
    await assert.rejects(renderEmail({ ...row, type: "UNKNOWN" }), /unknown email type/);
  }));
