import { Schema, model } from "mongoose";
import { idField, schemaOptions } from "./base";
import { EVENT_STATUSES } from "./enums";

const eventSchema = new Schema(
  {
    id: idField,
    slug: { type: String, required: true, unique: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", maxlength: 10000 },
    venueName: { type: String, required: true, trim: true, maxlength: 150 },
    venueAddress: { type: String, default: "", trim: true, maxlength: 300 },
    mapsUrl: { type: String, maxlength: 500, default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, default: "Asia/Jakarta", maxlength: 40 },
    checkInOpensAt: { type: Date, default: null },
    posterUrl: { type: String, default: null },
    posterPath: { type: String, default: null },
    capacity: { type: Number, min: 1, default: null },
    maxTicketsPerUser: { type: Number, min: 1, default: null },
    status: { type: String, enum: [...EVENT_STATUSES], default: "DRAFT" },
    publishedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, maxlength: 500, default: null },
    createdBy: { type: String, ref: "User", required: true },
    version: { type: Number, default: 0 },
  },
  schemaOptions("events"),
);
eventSchema.index({ status: 1, startAt: 1 });
export const Event = model("Event", eventSchema);

const ticketTypeSchema = new Schema(
  {
    id: idField,
    eventId: { type: String, ref: "Event", required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 500, default: null },
    price: { type: Number, required: true, min: 0 },
    quota: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, min: 0, default: 0 },
    reservedCount: { type: Number, min: 0, default: 0 },
    salesStartAt: { type: Date, required: true },
    salesEndAt: { type: Date, required: true },
    maxPerOrder: { type: Number, min: 1, max: 20, default: 5 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
  },
  schemaOptions("ticketTypes"),
);
ticketTypeSchema.index({ eventId: 1, sortOrder: 1 });
ticketTypeSchema.index(
  { eventId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

ticketTypeSchema.path("quota").validate(function (
  this: unknown,
  value: number,
) {
  const doc = this as { soldCount?: number; reservedCount?: number };
  return (doc.soldCount ?? 0) + (doc.reservedCount ?? 0) <= value;
}, "soldCount + reservedCount tidak boleh melebihi quota");
ticketTypeSchema.virtual("available").get(function (this: {
  quota: number;
  soldCount: number;
  reservedCount: number;
}) {
  return Math.max(0, this.quota - this.soldCount - this.reservedCount);
});
export const TicketType = model("TicketType", ticketTypeSchema);

const eventStaffSchema = new Schema(
  {
    id: idField,
    eventId: { type: String, ref: "Event", required: true },
    userId: { type: String, ref: "User", required: true },
    assignedBy: { type: String, ref: "User", required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  schemaOptions("eventStaffs", { timestamps: false }),
);
eventStaffSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventStaffSchema.index({ userId: 1 });
export const EventStaff = model("EventStaff", eventStaffSchema);
