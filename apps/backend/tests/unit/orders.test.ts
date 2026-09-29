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
test("orderView: pesanan gratis → payment null, tickets berisi TicketSummary ter-mask", async () => {
  const { orderView } = await import("../../src/services/order-service");
  const order = { id: "o1", userId: "u1", status: "PAID", items: [{ ticketTypeId: "t1", ticketTypeName: "Gratis", unitPrice: 0, quantity: 1, lineTotal: 0 }] } as never;
  const view = orderView(order, null, [{ id: "k1", code: "7K2M9XDQ4R8B3N5P", holderName: "Rina", ticketTypeId: "t1", status: "VALID", checkedInAt: null }], true);
  assert.equal(view.payment, null);
  assert.deepEqual(view.tickets, [{ id: "k1", codeMasked: "••••-••••-••••-3N5P", holderName: "Rina", ticketTypeId: "t1", ticketTypeName: "Gratis", status: "VALID", checkedInAt: null }]);
});

test("orderView: snapToken hanya untuk pemilik saat PENDING_PAYMENT", async () => {
  const { orderView } = await import("../../src/services/order-service");
  const payment = { provider: "MIDTRANS", status: "PENDING", paymentType: null, snapToken: "tok", snapRedirectUrl: "https://x", settledAt: null, lastSyncedAt: null };
  const pending = { id: "o1", userId: "u1", status: "PENDING_PAYMENT", items: [] } as never;
  assert.equal(orderView(pending, payment, [], true).payment?.snapToken, "tok");
  assert.equal(orderView(pending, payment, [], false).payment?.snapToken, null);
  assert.equal(orderView({ ...(pending as object), status: "PAID" } as never, payment, [], true).payment?.snapRedirectUrl, null);
});
