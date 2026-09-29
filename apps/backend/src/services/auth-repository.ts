import mongoose, { Schema, type Model } from "mongoose";

export type UserRole = "ORGANIZER" | "STAFF" | "ATTENDEE";
export type AuthPurpose = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

export interface AuthTokenRecord {
  id: string;
  userId: string;
  purpose: AuthPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

interface EmailOutboxRecord {
  id: string;
  type: string;
  to: string;
  payload: Record<string, string>;
  status: "PENDING";
  attempts: number;
  nextAttemptAt: Date;
  createdAt: Date;
}

const userSchema = new Schema<UserRecord>({}, { strict: false, timestamps: true, versionKey: false });
const refreshTokenSchema = new Schema<RefreshTokenRecord>({}, { strict: false, versionKey: false });
const authTokenSchema = new Schema<AuthTokenRecord>({}, { strict: false, versionKey: false });
const emailOutboxSchema = new Schema<EmailOutboxRecord>({}, { strict: false, versionKey: false });

function model<T>(name: string, schema: Schema<T>, collection: string): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection);
}

export const UserModel = model("User", userSchema, "users");
export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema, "refreshTokens");
export const AuthTokenModel = model("AuthToken", authTokenSchema, "authTokens");
export const EmailOutboxModel = model("EmailOutbox", emailOutboxSchema, "emailOutbox");