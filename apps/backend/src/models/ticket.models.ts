import { Schema, model } from "mongoose";
import { idField, schemaOptions } from "./base";
import {
  CHECK_IN_METHODS,
  CHECK_IN_RESULTS,
  TICKET_STATUSES,
  VOID_REASONS,
} from "./enums";

const ticketSchema = new Schema(
  {
    _id: idField,
    code: {
      type: String,
      required: true,
      unique: true,
      minlength: 16,
      maxlength: 16,
    },
    orderId: { type: String, ref: "Order", required: true },
    eventId: { type: String, ref: "Event", required: true },
    ticketTypeId: { type: String, ref: "TicketType", required: true },
    ownerId: { type: String, ref: "User", required: true },
    holderName: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: [...TICKET_STATUSES], default: "VALID" },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: String, ref: "User", default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, enum: [...VOID_REASONS] }, // tanpa default: validator enum menolak null
    codeVersion: { type: Number, default: 1 },
    version: { type: Number, default: 0 },
  },
  schemaOptions("tickets"),
);
ticketSchema.index({ eventId: 1, status: 1 });
ticketSchema.index({ ownerId: 1, _id: -1 });
ticketSchema.index({ orderId: 1 });
ticketSchema.index({ holderName: "text" });
export const Ticket = model("Ticket", ticketSchema);

const checkInSchema = new Schema(
  {
    _id: idField,
    eventId: { type: String, ref: "Event", required: true },
    ticketId: { type: String, ref: "Ticket", default: null },
    scannedCodeMasked: { type: String, maxlength: 4, default: null },
    method: { type: String, enum: [...CHECK_IN_METHODS], required: true },
    result: { type: String, enum: [...CHECK_IN_RESULTS], required: true },
    scannedBy: { type: String, ref: "User", required: true },
    revertedAt: { type: Date, default: null },
    revertedBy: { type: String, ref: "User", default: null },
    revertReason: { type: String, maxlength: 500, default: null },
  },
  schemaOptions("checkIns", { updatedAt: false }),
);
checkInSchema.index({ eventId: 1, _id: -1 });
checkInSchema.index({ ticketId: 1 });
export const CheckIn = model("CheckIn", checkInSchema);
