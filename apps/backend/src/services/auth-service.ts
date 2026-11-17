import { uuidv7 } from "../utils/uuid";
import bcrypt from "bcryptjs";
import {
  createAccessToken,
  createOpaqueToken,
  durationFromEnv,
  hashToken,
} from "../lib/auth-tokens";
import {
  AuthTokenModel,
  EmailOutboxModel,
  RefreshTokenModel,
  UserModel,
  type AuthTokenRecord,
  type AuthPurpose,
  type RefreshTokenRecord,
  type UserRecord,
  type UserRole,
} from "./auth-repository";
import { AppError } from "../utils/app-error";

const publicUser = (user: UserRecord) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  emailVerified: user.emailVerified,
  tokenVersion: user.tokenVersion,
  version: user.version,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Kontrak §2.3: token tepat sebelumnya masih diterima 10 detik setelah dirotasi. Jendela dihitung dari rotasi
// pertama (revokedAt tidak diperbarui saat grace), jadi token curian tidak bisa diperpanjang terus.
const REFRESH_GRACE_MS = 10_000;

function now(): Date {
  return new Date();
}

function toUserRecord(user: UserRecord): UserRecord {
  return user;
}

async function queueTokenEmail(user: UserRecord, type: string, token: string): Promise<void> {
  await EmailOutboxModel.create({
    id: uuidv7(),
    type,
    to: user.email,
    payload: { token, userId: user.id },
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: now(),
    createdAt: now(),
  });
}

export async function register(input: {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const existing = await UserModel.findOne({ email }).lean<UserRecord>();

  if (!existing) {
    const user: UserRecord = {
      id: uuidv7(),
      name: input.name.trim(),
      email,
      phone: input.phone ?? null,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: "ATTENDEE",
      isActive: true,
      emailVerified: false,
      tokenVersion: 0,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    await UserModel.create(user);
    const token = createOpaqueToken();
    await AuthTokenModel.create({
      id: uuidv7(),
      userId: user.id,
      purpose: "EMAIL_VERIFICATION" satisfies AuthPurpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
      createdAt: now(),
    });
    await queueTokenEmail(user, "EMAIL_VERIFICATION", token);
  }
}

export async function login(input: { email: string; password: string }): Promise<{ accessToken: string; user: ReturnType<typeof publicUser> }> {
  const user = await UserModel.findOne({ email: input.email.trim().toLowerCase() }).lean<UserRecord>();
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");

  if (!user || !valid || !user.isActive) {
    throw new AppError(401, "invalid-credentials", "Email atau password tidak valid.");
  }

  return {
    accessToken: createAccessToken(user),
    user: publicUser(toUserRecord(user)),
  };
}

/**
 * Masuk/daftar lewat Google. Email harus sudah diverifikasi Google.
 * - Email baru: akun ATTENDEE dibuat, langsung terverifikasi, password acak (bisa diatur lewat "Lupa password").
 * - Email sudah ada: akun yang sama dipakai. Bila akun itu belum terverifikasi, password diganti acak dan sesi lama
 *   dicabut, supaya orang yang mendaftar dengan email milik orang lain tidak bisa masuk lagi.
 */
export async function loginWithGoogle(profile: { email: string; emailVerified: boolean; name: string }): Promise<{
  accessToken: string;
  user: ReturnType<typeof publicUser>;
  record: UserRecord;
}> {
  if (!profile.emailVerified) throw new AppError(403, "google-email-unverified", "Email Google ini belum terverifikasi.");
  let user = await UserModel.findOne({ email: profile.email }).lean<UserRecord>();

  if (!user) {
    user = {
      id: uuidv7(),
      name: profile.name.slice(0, 100),
      email: profile.email,
      phone: null,
      passwordHash: await bcrypt.hash(createOpaqueToken(), 12),
      role: "ATTENDEE",
      isActive: true,
      emailVerified: true,
      tokenVersion: 0,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    await UserModel.create(user);
  } else {
    if (!user.isActive) throw new AppError(401, "invalid-credentials", "Akun ini dinonaktifkan.");
    if (!user.emailVerified) {
      user = await UserModel.findOneAndUpdate(
        { id: user.id },
        {
          $set: { emailVerified: true, passwordHash: await bcrypt.hash(createOpaqueToken(), 12), updatedAt: now() },
          $inc: { tokenVersion: 1, version: 1 },
        },
        { new: true },
      ).lean<UserRecord>();
      if (!user) throw new AppError(401, "invalid-credentials", "Akun tidak ditemukan.");
      await RefreshTokenModel.updateMany({ userId: user.id, revokedAt: null }, { $set: { revokedAt: now() } });
    }
  }

  return { accessToken: createAccessToken(user), user: publicUser(toUserRecord(user)), record: user };
}

export async function issueRefreshToken(user: UserRecord, metadata: { userAgent?: string; ip?: string }): Promise<string> {
  const token = createOpaqueToken();
  await RefreshTokenModel.create({
    id: uuidv7(),
    userId: user.id,
    tokenHash: hashToken(token),
    familyId: uuidv7(),
    expiresAt: new Date(Date.now() + durationFromEnv("REFRESH_TOKEN_TTL", "7d")),
    revokedAt: null,
    replacedById: null,
    userAgent: metadata.userAgent ?? null,
    ip: metadata.ip ?? null,
    createdAt: now(),
  });
  return token;
}

export async function refreshSession(token: string, metadata: { userAgent?: string; ip?: string }): Promise<{ accessToken: string; user: ReturnType<typeof publicUser>; refreshToken: string }> {
  const invalid = () => new AppError(401, "refresh-token-invalid", "Refresh token tidak valid.");
  const record = await RefreshTokenModel.findOne({ tokenHash: hashToken(token) }).lean<RefreshTokenRecord>();
  // Kontrak §2.3: grace period untuk token TEPAT sebelumnya. Kasus nyata: browser pindah halaman saat refresh
  // sedang berjalan → server sudah merotasi, tapi Set-Cookie baru tidak pernah diterima, sehingga refresh
  // berikutnya membawa token lama. Tanpa grace, seluruh family dicabut dan pengguna terlempar ke /login.
  // Server hanya menyimpan hash, jadi token pengganti tidak bisa dikirim ulang: terbitkan pengganti baru
  // di family yang sama, dan cabut pengganti sebelumnya yang (kemungkinan) tidak pernah sampai.
  const inGrace = (r: RefreshTokenRecord) => !!r.revokedAt && now().getTime() - r.revokedAt.getTime() <= REFRESH_GRACE_MS;
  let previousReplacementId: string | null = null;
  if (record?.revokedAt && record.replacedById) {
    const replacement = await RefreshTokenModel.findOne({ id: record.replacedById }).lean<RefreshTokenRecord>();
    if (inGrace(record) && replacement && !replacement.revokedAt && !replacement.replacedById) {
      previousReplacementId = replacement.id;
    } else {
      await RefreshTokenModel.updateMany({ familyId: record.familyId, revokedAt: null }, { $set: { revokedAt: now() } });
      throw new AppError(401, "refresh-token-reused", "Refresh token digunakan ulang.");
    }
  }
  if (!record || (record.revokedAt && !previousReplacementId) || record.expiresAt <= now()) throw invalid();

  const user = await getUserById(record.userId);
  if (!user || !user.isActive) throw invalid();

  const replacement = createOpaqueToken();
  const replacementId = uuidv7();
  // Klaim atomik: token aktif biasa, atau (grace) pengganti sebelumnya yang masih aktif. Dua request yang balapan
  // tidak bisa sama-sama menang; yang kalah mendapat refresh-token-invalid dan FE single-flight tidak terdampak.
  const claimed = previousReplacementId
    ? await RefreshTokenModel.findOneAndUpdate(
        { id: previousReplacementId, revokedAt: null, replacedById: null },
        { $set: { revokedAt: now(), replacedById: replacementId } },
      )
    : await RefreshTokenModel.findOneAndUpdate(
        { id: record.id, revokedAt: null },
        { $set: { revokedAt: now(), replacedById: replacementId } },
      );
  if (!claimed) throw invalid();
  if (previousReplacementId) {
    // Token lama ikut menunjuk ke pengganti terbaru, supaya grace berikutnya (bila terulang) mengikuti rantai.
    await RefreshTokenModel.updateOne({ id: record.id }, { $set: { replacedById: replacementId } });
  }
  await RefreshTokenModel.create({
    id: replacementId,
    userId: user.id,
    tokenHash: hashToken(replacement),
    familyId: record.familyId,
    expiresAt: new Date(Date.now() + durationFromEnv("REFRESH_TOKEN_TTL", "7d")),
    revokedAt: null,
    replacedById: null,
    userAgent: metadata.userAgent ?? record.userAgent,
    ip: metadata.ip ?? record.ip,
    createdAt: now(),
  });

  return { accessToken: createAccessToken(user), user: publicUser(user), refreshToken: replacement };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await RefreshTokenModel.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { $set: { revokedAt: now() } });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await UserModel.updateOne({ id: userId }, { $inc: { tokenVersion: 1 }, $set: { updatedAt: now() } });
  await RefreshTokenModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: now() } });
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await AuthTokenModel.findOne({ tokenHash: hashToken(token), purpose: "EMAIL_VERIFICATION", usedAt: null }).lean<AuthTokenRecord>();
  if (!record || record.expiresAt <= now()) {
    throw new AppError(422, "auth-token-invalid", "Token verifikasi tidak valid.");
  }
  await AuthTokenModel.updateOne({ id: record.id }, { $set: { usedAt: now() } });
  await UserModel.updateOne({ id: record.userId }, { $set: { emailVerified: true, updatedAt: now() } });
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const user = await UserModel.findOne({ email: emailInput.trim().toLowerCase(), isActive: true }).lean<UserRecord>();
  if (!user) return;

  await AuthTokenModel.updateMany({ userId: user.id, purpose: "PASSWORD_RESET", usedAt: null }, { $set: { usedAt: now() } });
  const token = createOpaqueToken();
  await AuthTokenModel.create({
    id: uuidv7(),
    userId: user.id,
    purpose: "PASSWORD_RESET" satisfies AuthPurpose,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    createdAt: now(),
  });
  await queueTokenEmail(user, "PASSWORD_RESET", token);
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  const record = await AuthTokenModel.findOne({ tokenHash: hashToken(token), purpose: "PASSWORD_RESET", usedAt: null }).lean<AuthTokenRecord>();
  if (!record || record.expiresAt <= now()) {
    throw new AppError(422, "auth-token-invalid", "Token reset password tidak valid.");
  }
  await AuthTokenModel.updateOne({ id: record.id }, { $set: { usedAt: now() } });
  await UserModel.updateOne({ id: record.userId }, {
    $set: { passwordHash: await bcrypt.hash(password, 12), emailVerified: true, updatedAt: now() },
    $inc: { tokenVersion: 1 },
  });
  await RefreshTokenModel.updateMany({ userId: record.userId, revokedAt: null }, { $set: { revokedAt: now() } });
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  return UserModel.findOne({ id }).lean<UserRecord>();
}

export function serializeUser(user: UserRecord): ReturnType<typeof publicUser> {
  return publicUser(user);
}

export function roleIsValid(role: string): role is UserRole {
  return ["ORGANIZER", "STAFF", "ATTENDEE"].includes(role);
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user || user.emailVerified) {
    throw new AppError(409, "email-already-verified", "Email sudah terverifikasi.");
  }
  const token = createOpaqueToken();
  await AuthTokenModel.updateMany({ userId, purpose: "EMAIL_VERIFICATION", usedAt: null }, { $set: { usedAt: now() } });
  await AuthTokenModel.create({ id: uuidv7(), userId, purpose: "EMAIL_VERIFICATION", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), usedAt: null, createdAt: now() });
  await queueTokenEmail(user, "EMAIL_VERIFICATION", token);
}