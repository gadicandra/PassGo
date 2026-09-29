import type { Model } from "mongoose";
import * as models from "../models";

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

export const UserModel = models.User as unknown as Model<UserRecord>;
export const RefreshTokenModel =
  models.RefreshToken as unknown as Model<RefreshTokenRecord>;
export const AuthTokenModel =
  models.AuthToken as unknown as Model<AuthTokenRecord>;
export const EmailOutboxModel =
  models.EmailOutbox as unknown as Model<EmailOutboxRecord>;
