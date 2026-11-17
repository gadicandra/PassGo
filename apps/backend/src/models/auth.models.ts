import { Schema, model } from "mongoose";
import { idField, schemaOptions } from "./base";
import { AUTH_TOKEN_PURPOSES, IDEMPOTENCY_STATES, USER_ROLES } from "./enums";

const userSchema = new Schema(
  {
    id: idField,
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: { type: String, trim: true, maxlength: 20, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: [...USER_ROLES], required: true },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
    // Superadmin: ORGANIZER yang boleh menyetujui pengajuan penyelenggara. Hanya diatur lewat
    // scripts/set-superadmin.ts, tidak pernah lewat API.
    isSuperAdmin: { type: Boolean, default: false },
    // Pengajuan peserta untuk menjadi penyelenggara; diputuskan oleh ORGANIZER (kontrak §9.15).
    organizerRequest: {
      type: new Schema(
        {
          status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], required: true },
          organization: { type: String, trim: true, maxlength: 120, required: true },
          reason: { type: String, trim: true, maxlength: 500, required: true },
          link: { type: String, trim: true, maxlength: 200, default: null },
          requestedAt: { type: Date, required: true },
          decidedAt: { type: Date, default: null },
          decidedBy: { type: String, default: null },
          note: { type: String, trim: true, maxlength: 300, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  schemaOptions("users", { hide: ["passwordHash"] }),
);
userSchema.index({ "organizerRequest.status": 1, "organizerRequest.requestedAt": 1 });
userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export const User = model("User", userSchema);

const refreshTokenSchema = new Schema(
  {
    id: idField,
    userId: { type: String, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedById: { type: String, ref: "RefreshToken", default: null },
    userAgent: { type: String, maxlength: 300, default: null },
    ip: { type: String, maxlength: 64, default: null },
  },
  schemaOptions("refreshTokens", { updatedAt: false, hide: ["tokenHash"] }),
);

refreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
export const RefreshToken = model("RefreshToken", refreshTokenSchema);

const authTokenSchema = new Schema(
  {
    id: idField,
    userId: { type: String, ref: "User", required: true, index: true },
    purpose: { type: String, enum: [...AUTH_TOKEN_PURPOSES], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  schemaOptions("authTokens", { updatedAt: false, hide: ["tokenHash"] }),
);
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthToken = model("AuthToken", authTokenSchema);

const idempotencyKeySchema = new Schema(
  {
    id: idField,
    userId: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    key: { type: String, required: true },
    requestHash: { type: String, required: true },
    state: {
      type: String,
      enum: [...IDEMPOTENCY_STATES],
      default: "IN_PROGRESS",
    },
    responseStatus: { type: Number, default: null },
    responseHeaders: { type: Schema.Types.Mixed, default: null },
    responseBody: { type: Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
  },
  schemaOptions("idempotencyKeys", { updatedAt: false }),
);
idempotencyKeySchema.index(
  { userId: 1, method: 1, path: 1, key: 1 },
  { unique: true },
);
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const IdempotencyKey = model("IdempotencyKey", idempotencyKeySchema);
