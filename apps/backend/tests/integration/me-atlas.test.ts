import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app";
import { connectDatabase, disconnectDatabase } from "../../src/lib/database";
import { createAccessToken } from "../../src/lib/auth-tokens";
import { Event, EventStaff, Ticket, TicketType, User } from "../../src/models";
import { uuidv7 } from "../../src/utils/uuid";

const atlasEnabled = Boolean(process.env.MONGODB_URI);

test("GET /api/v1/me/assigned-events returns derived Atlas statistics", { skip: !atlasEnabled }, async () => {
  await connectDatabase();
  const organizerId = uuidv7();
  const staffId = uuidv7();
  const eventId = uuidv7();
  const ticketTypeId = uuidv7();
  const ticketIds = [uuidv7(), uuidv7()];

  try {
    await User.create([
      { id: organizerId, name: "Atlas Organizer", email: `${organizerId}@example.com`, passwordHash: "test", role: "ORGANIZER", isActive: true, emailVerified: true, tokenVersion: 0, version: 1 },
      { id: staffId, name: "Atlas Staff", email: `${staffId}@example.com`, passwordHash: "test", role: "STAFF", isActive: true, emailVerified: true, tokenVersion: 0, version: 1 },
    ]);
    await Event.create({ id: eventId, slug: `atlas-${eventId}`, title: "Atlas Event", description: "Event", venueName: "Venue", venueAddress: "Address", startAt: new Date(Date.now() + 60 * 60 * 1000), endAt: new Date(Date.now() + 3 * 60 * 60 * 1000), timezone: "Asia/Jakarta", status: "PUBLISHED", createdBy: organizerId, version: 1 });
    await EventStaff.create({ id: uuidv7(), eventId, userId: staffId, assignedBy: organizerId });
    await TicketType.create({ id: ticketTypeId, eventId, name: "VIP", price: 75000, quota: 10, soldCount: 2, reservedCount: 3, salesStartAt: new Date(Date.now() - 60 * 60 * 1000), salesEndAt: new Date(Date.now() + 60 * 60 * 1000), maxPerOrder: 5, isActive: true, version: 1 });
    await Ticket.create(ticketIds.map((id) => ({ id, code: id.replaceAll("-", "").slice(0, 16), orderId: uuidv7(), eventId, ticketTypeId, ownerId: staffId, holderName: "Holder", status: id === ticketIds[0] ? "VALID" : "CHECKED_IN", version: 1 })));

    const token = createAccessToken({ id: staffId, role: "STAFF", tokenVersion: 0 });
    const response = await request(app).get("/api/v1/me/assigned-events?when=upcoming").set("Authorization", `Bearer ${token}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].priceFrom, 75000);
    assert.equal(response.body.data[0].salesStatus, "ON_SALE");
    assert.deepEqual(response.body.data[0].stats, { ticketsSold: 2, ticketsReserved: 3, totalQuota: 10, checkedIn: 1 });
  } finally {
    await Promise.all([
      User.deleteMany({ id: { $in: [organizerId, staffId] } }),
      Event.deleteOne({ id: eventId }),
      EventStaff.deleteOne({ eventId }),
      TicketType.deleteOne({ id: ticketTypeId }),
      Ticket.deleteMany({ id: { $in: ticketIds } }),
    ]);
    await disconnectDatabase();
    await mongoose.connection.close();
  }
});