import { Schema, model } from "mongoose";
import { idField, schemaOptions } from "./base";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  TICKET_EMAIL_STATUSES,
} from "./enums";

const orderItemSchema = new Schema(
  {
    ticketTypeId: { type: String, ref: "TicketType", required: true },
    ticketTypeName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    id: idField,
    orderNumber: { type: String, required: true, unique: true, maxlength: 20 },
    userId: { type: String, ref: "User", required: true },
    eventId: { type: String, ref: "Event", required: true },
    status: {
      type: String,
      enum: [...ORDER_STATUSES],
      default: "PENDING_PAYMENT",
    },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
    buyerPhone: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, maxlength: 500, default: null },
    refundStatus: {
      type: String,
      enum: [...REFUND_STATUSES],
      default: "NOT_REQUIRED",
    },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, min: 0, default: null },
    refundNote: { type: String, maxlength: 500, default: null },
    refundedBy: { type: String, ref: "User", default: null },
    ticketEmailStatus: {
      type: String,
      enum: [...TICKET_EMAIL_STATUSES],
      default: "NOT_APPLICABLE",
    },
  },
  schemaOptions("orders"),
);
orderSchema.index({ userId: 1, id: -1 });
orderSchema.index({ eventId: 1, status: 1 });
orderSchema.index({ status: 1, expiresAt: 1 });

orderSchema.index(
  { userId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING_PAYMENT" } },
);
export const Order = model("Order", orderSchema);

const paymentSchema = new Schema(
  {
    id: idField,
    orderId: { type: String, ref: "Order", required: true, unique: true },
    provider: { type: String, enum: ["MIDTRANS"], default: "MIDTRANS" },
    providerOrderId: { type: String, required: true, unique: true },
    snapToken: { type: String, default: null },
    snapRedirectUrl: { type: String, default: null },
    providerTransactionId: { type: String, default: null },
    paymentType: { type: String, default: null },
    status: { type: String, enum: [...PAYMENT_STATUSES], default: "PENDING" },
    providerStatus: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    settledAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: null },
    rawNotification: { type: Schema.Types.Mixed, default: null },
  },
  schemaOptions("payments", { hide: ["rawNotification"] }),
);
export const Payment = model("Payment", paymentSchema);
