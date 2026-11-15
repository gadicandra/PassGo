// Self-check tanpa framework (dari apps/frontend): npx tsx src/lib/api.check.mts
// Menguji klien API terhadap fetch palsu: refresh single-flight, retry setelah token-expired, dan pemetaan error.
import assert from "node:assert/strict";
import { api, ApiError, refreshSession, setSession } from "./api";

const problem = (status: number, code: string) =>
  new Response(JSON.stringify({ title: code, status, code, detail: code }), { status, headers: { "content-type": "application/problem+json" } });
const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
const session = (token: string) => ({ accessToken: token, tokenType: "Bearer", expiresIn: 900, user: { id: "u1", role: "ATTENDEE" } });

let refreshCalls = 0;
globalThis.fetch = (async (url: string, init: RequestInit) => {
  const auth = (init.headers as Record<string, string>).Authorization;
  if (url === "/api/v1/auth/refresh") {
    refreshCalls++;
    await new Promise((r) => setTimeout(r, 10));
    return ok(session("fresh"));
  }
  if (url === "/api/v1/me") return auth === "Bearer fresh" ? ok({ id: "u1" }) : problem(401, "token-expired");
  if (url === "/api/v1/revoked") return problem(401, "token-revoked");
  if (url === "/api/v1/form")
    return new Response(JSON.stringify({ title: "v", status: 422, code: "validation-error", errors: [{ pointer: "#/email", detail: "Email tidak valid" }] }), { status: 422, headers: { "content-type": "application/problem+json" } });
  return problem(500, "x");
}) as typeof fetch;

setSession(session("stale") as never);
// Tiga request kedaluwarsa bersamaan → tepat satu refresh, semua berhasil setelah retry.
const results = await Promise.all([api("/me"), api("/me"), api("/me")]);
assert.equal(refreshCalls, 1);
assert.deepEqual(results, [{ id: "u1" }, { id: "u1" }, { id: "u1" }]);

// token-revoked tidak memicu refresh dan dilempar sebagai ApiError.
await assert.rejects(api("/revoked"), (e) => e instanceof ApiError && e.code === "token-revoked");
assert.equal(refreshCalls, 1);

// 422 → fieldErrors per nama field.
await assert.rejects(api("/form"), (e) => e instanceof ApiError && e.fieldErrors().email === "Email tidak valid");

// refreshSession dipanggil berulang saat masih berjalan → promise yang sama.
assert.equal(refreshSession(), refreshSession());

console.log("api.check ok");
