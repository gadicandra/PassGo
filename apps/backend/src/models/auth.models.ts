import { Schema, model } from "mongoose";
import { idField, schemaOptions } from "./base";
import { AUTH_TOKEN_PURPOSES, IDEMPOTENCY_STATES, USER_ROLES } from "./enums";

const userSchema = new Schema(
  {
    _id: idField,
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
    emailVerifiedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
  },
  schemaOptions("users", { hide: ["passwordHash"] }),
);
userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
userSchema.virtual("emailVerified").get(function (this: {
  emailVerifiedAt: Date | null;
}) {
  return this.emailVerifiedAt != null;
});
export const User = model("User", userSchema);

const refreshTokenSchema = new Schema(
  {
    _id: idField,
    userId: { type: String, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, ref: "RefreshToken", default: null },
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
    _id: idField,
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
    _id: idField,
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
