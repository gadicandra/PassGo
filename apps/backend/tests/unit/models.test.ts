import assert from "node:assert/strict";
import test from "node:test";
import { TicketType, User } from "../../src/models";
import { uuidv7 } from "../../src/utils/uuid";

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("uuidv7 berformat benar dan terurut waktu", async () => {
  const a = uuidv7();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const b = uuidv7();
  assert.match(a, UUID_V7);
  assert.match(b, UUID_V7);
  assert.ok(a < b);
});

test("User: id UUID v7, email dinormalisasi, passwordHash tidak keluar di JSON", () => {
  const user = new User({
    name: "Rina",
    email: " RINA@Example.com ",
    passwordHash: "rahasia",
    role: "ATTENDEE",
  });
  const json = user.toJSON() as Record<string, unknown>;
  assert.match(String(json.id), UUID_V7);
  assert.equal(json._id, undefined);
  assert.equal(json.passwordHash, undefined);
  assert.equal(user.email, "rina@example.com");
});

test("TicketType: sold + reserved tidak boleh melebihi quota", async () => {
  const ticketType = new TicketType({
    eventId: "e1",
    name: "VIP",
    price: 0,
    quota: 10,
    soldCount: 8,
    reservedCount: 5,
    salesStartAt: new Date(),
    salesEndAt: new Date(),
  });
  await assert.rejects(() => ticketType.validate());
});
