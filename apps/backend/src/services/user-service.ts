import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { UserModel, type UserRecord, type UserRole } from "./auth-repository";
import { serializeUser } from "./auth-service";
import { AppError } from "../utils/app-error";

type UserResponse = ReturnType<typeof serializeUser>;

function now(): Date { return new Date(); }

function parseVersion(value: string | undefined): number {
  if (!value || value === "*") throw new AppError(428, "precondition-required", "If-Match wajib dikirim.");
  const match = /^"(\d+)"$/.exec(value);
  if (!match) throw new AppError(428, "precondition-required", "If-Match tidak valid.");
  return Number(match[1]);
}

async function requireCurrentVersion(id: string, header: string | undefined): Promise<UserRecord> {
  const version = parseVersion(header);
  const user = await UserModel.findOne({ id }).lean<UserRecord>();
  if (!user) throw new AppError(404, "user-not-found", "User tidak ditemukan.");
  if (user.version !== version) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.", { current: serializeUser(user) });
  return user;
}

export async function listUsers(query: { page: number; pageSize: number; role?: UserRole; isActive?: boolean; q?: string }): Promise<{ data: UserResponse[]; meta: Record<string, unknown> }> {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.q) filter.$or = [{ name: { $regex: query.q, $options: "i" } }, { email: { $regex: query.q, $options: "i" } }];
  const [users, totalItems] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize).lean<UserRecord[]>(),
    UserModel.countDocuments(filter),
  ]);
  return { data: users.map(serializeUser), meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) } };
}

export async function getUser(id: string): Promise<UserResponse> {
  const user = await UserModel.findOne({ id }).lean<UserRecord>();
  if (!user) throw new AppError(404, "user-not-found", "User tidak ditemukan.");
  return serializeUser(user);
}

export async function createManagedUser(input: { name: string; email: string; phone?: string | null; role: "STAFF" | "ORGANIZER"; password: string }): Promise<UserResponse> {
  const email = input.email.trim().toLowerCase();
  if (await UserModel.exists({ email })) throw new AppError(409, "email-taken", "Email sudah digunakan.");
  const created = await UserModel.create({
    id: randomUUID(), name: input.name.trim(), email, phone: input.phone ?? null,
    passwordHash: await bcrypt.hash(input.password, 12), role: input.role,
    isActive: true, emailVerified: true, tokenVersion: 0, version: 1, createdAt: now(), updatedAt: now(),
  });
  return serializeUser(created.toObject() as UserRecord);
}

export async function updateManagedUser(actorId: string, id: string, header: string | undefined, input: { name?: string; phone?: string | null; role?: UserRole; isActive?: boolean }): Promise<UserResponse> {
  const current = await requireCurrentVersion(id, header);
  if (actorId === id && (input.role !== undefined || input.isActive !== undefined)) throw new AppError(409, "cannot-modify-self", "Organizer tidak dapat mengubah peran atau status dirinya sendiri.");
  if (input.role === "ATTENDEE" || (input.role && current.role === "ATTENDEE")) throw new AppError(422, "validation-error", "Akun ATTENDEE tidak dapat dikelola sebagai akun internal.");
  if (input.role && input.role !== current.role && !((current.role === "STAFF" && input.role === "ORGANIZER") || (current.role === "ORGANIZER" && input.role === "STAFF"))) throw new AppError(422, "validation-error", "Transisi peran tidak diizinkan.");
  if (current.role === "ORGANIZER" && (input.role === "STAFF" || input.isActive === false)) {
    const activeOrganizers = await UserModel.countDocuments({ role: "ORGANIZER", isActive: true });
    if (activeOrganizers <= 1) throw new AppError(409, "last-organizer", "Organizer aktif terakhir tidak dapat dinonaktifkan.");
  }
  const roleOrStatusChanged = input.role !== undefined || input.isActive !== undefined;
  const update: Record<string, unknown> = { ...input, updatedAt: now(), version: current.version + 1 };
  if (roleOrStatusChanged) update.tokenVersion = current.tokenVersion + 1;
  const updated = await UserModel.findOneAndUpdate({ id, version: current.version }, { $set: update }, { new: true }).lean<UserRecord>();
  if (!updated) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.");
  return serializeUser(updated);
}