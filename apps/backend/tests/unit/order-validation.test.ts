import { test } from "node:test";
import assert from "node:assert/strict";
import { midtransTime, remainingForUser, snapItemName, validateOrderItems } from "../../src/services/order-service";
import { AppError } from "../../src/utils/app-error";
import type { TicketTypeRecord } from "../../src/services/order-repository";

const at = new Date("2026-09-29T03:00:00Z");
const type = (overrides: Partial<TicketTypeRecord> = {}): TicketTypeRecord => ({
  id: "tt-a", eventId: "ev", name: "Reguler", price: 50000, quota: 10, soldCount: 0, reservedCount: 0, maxPerOrder: 5, isActive: true,
  salesStartAt: new Date("2026-09-01T00:00:00Z"), salesEndAt: new Date("2026-10-01T00:00:00Z"), ...overrides,
} as TicketTypeRecord);

function problem(fn: () => void): AppError {
  try { fn(); } catch (error) { assert.ok(error instanceof AppError); return error; }
  assert.fail("expected AppError");
}

test("tipe tiket milik acara lain → 422 dengan pointer", () => {
  const error = problem(() => validateOrderItems([{ ticketTypeId: "tt-x", quantity: 1, expectedUnitPrice: 0 }], [type()], at));
  assert.equal(error.status, 422);
  assert.deepEqual((error.extra.errors as Array<{ pointer: string }>)[0].pointer, "#/items/0/ticketTypeId");
});

test("quantity > maxPerOrder → 422 max-per-order-exceeded", () => {
  const error = problem(() => validateOrderItems([{ ticketTypeId: "tt-a", quantity: 6, expectedUnitPrice: 50000 }], [type()], at));
  assert.equal(error.status, 422);
  assert.equal(error.code, "max-per-order-exceeded");
});

test("di luar jendela penjualan → 409 ticket-type-not-on-sale", () => {
  const error = problem(() => validateOrderItems([{ ticketTypeId: "tt-a", quantity: 1, expectedUnitPrice: 50000 }], [type({ salesStartAt: new Date("2026-09-30T00:00:00Z") })], at));
  assert.equal(error.code, "ticket-type-not-on-sale");
});

test("kuota kurang → 409 quota-exceeded + available", () => {
  const error = problem(() => validateOrderItems([{ ticketTypeId: "tt-a", quantity: 3, expectedUnitPrice: 50000 }], [type({ quota: 10, soldCount: 8 })], at));
  assert.equal(error.code, "quota-exceeded");
  assert.deepEqual(error.extra.errors, [{ pointer: "#/items/0/quantity", detail: "Tersisa 2 tiket", ticketTypeId: "tt-a", available: 2 }]);
});

test("harga berubah → 409 price-changed + errors[].currentUnitPrice", () => {
  const error = problem(() => validateOrderItems([{ ticketTypeId: "tt-a", quantity: 1, expectedUnitPrice: 40000 }], [type()], at));
  assert.equal(error.code, "price-changed");
  assert.equal((error.extra.errors as Array<{ currentUnitPrice: number }>)[0].currentUnitPrice, 50000);
});

test("maxTicketsPerUser: remaining hanya bila melebihi batas", () => {
  assert.equal(remainingForUser(null, 99, 5), null);
  assert.equal(remainingForUser(4, 1, 3), null);
  assert.equal(remainingForUser(4, 3, 2), 1);
});

test("payload Snap: nama item & start_time +0700", () => {
  assert.equal(snapItemName("Konser | Malam", "VIP"), "Konser  Malam - VIP");
  assert.equal([...snapItemName("x".repeat(60), "VIP")].length, 50);
  assert.equal(midtransTime(new Date("2026-09-29T03:04:05.678Z")), "2026-09-29 10:04:05 +0700");
});
