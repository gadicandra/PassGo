import { Schema, model } from "mongoose";
import { idField, schemaOptions } from "./base";
import { AUDIT_ACTOR_ROLES, EMAIL_STATUSES, EMAIL_TYPES } from "./enums";

const emailOutboxSchema = new Schema(
  {
    _id: idField,
    type: { type: String, enum: [...EMAIL_TYPES], required: true },
    to: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: [...EMAIL_STATUSES], default: "PENDING" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
    orderId: { type: String, ref: "Order", default: null },
  },
  schemaOptions("emailOutbox", { updatedAt: false }),
);
emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
export const EmailOutbox = model("EmailOutbox", emailOutboxSchema);

const auditLogSchema = new Schema(
  {
    _id: idField,
    actorId: { type: String, ref: "User", default: null },
    actorRole: { type: String, enum: [...AUDIT_ACTOR_ROLES], required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    eventId: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  schemaOptions("auditLogs", { updatedAt: false }),
);
auditLogSchema.index({ eventId: 1, _id: -1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ action: 1 });
export const AuditLog = model("AuditLog", auditLogSchema);
