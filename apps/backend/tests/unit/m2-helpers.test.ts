import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import app from "../../src/app";
import { csvCell } from "../../src/services/attendee-service";
import { maskEmail } from "../../src/services/ticket-service";
import { cursorPage, decodeCursor, encodeCursor } from "../../src/utils/cursor";
import { normalizeTicketCode } from "../../src/utils/ticket-code";
import { checkInBody } from "../../src/routes/events";
import { refundBody } from "../../src/routes/orders";
import { auditLogQuery } from "../../src/routes/audit-logs";
import { AppError } from "../../src/utils/app-error";

const UUID = "0192a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b";

test("normalizeTicketCode: format tampilan, huruf kecil, O/I/L, prefiks QR", () => {
  const code = "7K2M9XDQ4R8B3N5P";
  assert.equal(normalizeTicketCode("7k2m-9xdq-4r8b-3n5p").code, code);
  assert.equal(normalizeTicketCode(" 7K2M 9XDQ 4R8B 3N5P ").code, code);
  assert.equal(normalizeTicketCode("PASSGO1:7K2M9XDQ4R8B3N5P").code, code);
  assert.equal(normalizeTicketCode("passgo1:7k2m9xdq4r8b3n5p").code, code);
  assert.equal(normalizeTicketCode("XX9:7K2M9XDQ4R8B3N5P").code, null);
  assert.equal(normalizeTicketCode("TOO-SHORT").code, null);
  assert.equal(normalizeTicketCode("7K2M9XDQ4R8B3N5P").tail, "3N5P");
});

test("cursor: round-trip, terikat filter, rusak → 422", () => {
  const cursor = encodeCursor("abc", { eventId: "e1" });
  assert.equal(decodeCursor(cursor, { eventId: "e1" }), "abc");
  assert.equal(decodeCursor(undefined, {}), null);
  for (const [value, filters] of [[cursor, { eventId: "e2" }], ["!!garbage", {}]] as const) {
    assert.throws(() => decodeCursor(value, filters), (error: AppError) => error.status === 422 && error.code === "cursor-invalid");
  }
  const page = cursorPage([{ id: "3" }, { id: "2" }, { id: "1" }], 2, {});
  assert.deepEqual(page.data.map((row) => row.id), ["3", "2"]);
  assert.equal(page.meta.hasMore, true);
  assert.equal(decodeCursor(page.meta.nextCursor!, {}), "2");
  assert.equal(cursorPage([{ id: "1" }], 2, {}).meta.nextCursor, null);
});

test("maskEmail dan csvCell (anti formula injection)", () => {
  assert.equal(maskEmail("rina@example.com"), "r***@example.com");
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(null), "");
});

test("checkInBody: tepat satu dari code/ticketId", () => {
  assert.equal(checkInBody.safeParse({ code: "7K2M9XDQ4R8B3N5P" }).success, true);
  assert.equal(checkInBody.safeParse({ ticketId: UUID }).success, true);
  assert.equal(checkInBody.safeParse({}).success, false);
  assert.equal(checkInBody.safeParse({ code: "X", ticketId: UUID }).success, false);
  assert.equal(checkInBody.safeParse({ code: "X", extra: 1 }).success, false);
});

test("refundBody: amount integer positif, note 5–500, strict", () => {
  assert.equal(refundBody.safeParse({ amount: 75000, note: "Acara dibatalkan" }).success, true);
  assert.equal(refundBody.safeParse({ amount: 0, note: "Acara dibatalkan" }).success, false);
  assert.equal(refundBody.safeParse({ amount: 1.5, note: "Acara dibatalkan" }).success, false);
  assert.equal(refundBody.safeParse({ amount: 1, note: "   ab  " }).success, false);
  assert.equal(refundBody.safeParse({ amount: 1, note: "valid note", reason: "x" }).success, false);
});

test("auditLogQuery: daftar action, tanggal ber-offset, limit default", () => {
  const parsed = auditLogQuery.parse({ action: "ORDER_REFUNDED,TICKET_REISSUED", from: "2026-01-01T00:00:00+07:00" });
  assert.deepEqual(parsed.action, ["ORDER_REFUNDED", "TICKET_REISSUED"]);
  assert.ok(parsed.from instanceof Date);
  assert.equal(parsed.limit, 50);
  assert.equal(auditLogQuery.safeParse({ action: "order refunded" }).success, false);
  assert.equal(auditLogQuery.safeParse({ from: "2026-01-01T00:00:00" }).success, false);
});

test("endpoint M2 butuh autentikasi → 401", async () => {
  const calls = {
    "GET audit-logs": request(app).get("/api/v1/audit-logs"),
    "GET reports/sales": request(app).get(`/api/v1/events/${UUID}/reports/sales`),
    "GET reports/attendance": request(app).get(`/api/v1/events/${UUID}/reports/attendance`),
    "POST refund": request(app).post(`/api/v1/orders/${UUID}/refund`).send({ amount: 1, note: "valid note" }),
    "POST payment/sync": request(app).post(`/api/v1/orders/${UUID}/payment/sync`),
    "GET tickets": request(app).get("/api/v1/tickets"),
    "POST check-ins": request(app).post(`/api/v1/events/${UUID}/check-ins`).send({ code: "X" }),
  };
  for (const [label, call] of Object.entries(calls)) assert.equal((await call).status, 401, label);
});
