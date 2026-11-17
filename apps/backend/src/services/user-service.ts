import { uuidv7 } from "../utils/uuid";
import bcrypt from "bcryptjs";
import { UserModel, type UserRecord, type UserRole } from "./auth-repository";
import { serializeUser } from "./auth-service";
import { AppError } from "../utils/app-error";
import { assertVersion, ifMatchVersion, preconditionFailed } from "../utils/if-match";
import { recordAudit, type AuditContext } from "./audit-service";
import { EventStaff, Order, Ticket } from "../models";

type UserResponse = ReturnType<typeof serializeUser>;

function now(): Date { return new Date(); }

async function requireCurrentVersion(id: string, header: string | undefined): Promise<UserRecord> {
  const version = ifMatchVersion(header);
  const user = await UserModel.findOne({ id }).lean<UserRecord>();
  if (!user) throw new AppError(404, "user-not-found", "User tidak ditemukan.");
  assertVersion(version, user.version, serializeUser(user));
  return user;
}

export async function listUsers(query: { page: number; pageSize: number; role?: UserRole; isActive?: boolean; q?: string; sort: "name" | "-name" | "createdAt" | "-createdAt" }): Promise<{ data: UserResponse[]; meta: Record<string, unknown> }> {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.q) filter.$or = [{ name: { $regex: query.q, $options: "i" } }, { email: { $regex: query.q, $options: "i" } }];
  const [users, totalItems] = await Promise.all([
    UserModel.find(filter).sort({ [query.sort.replace(/^-/, "")]: query.sort.startsWith("-") ? -1 : 1, id: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize).lean<UserRecord[]>(),
    UserModel.countDocuments(filter),
  ]);
  return { data: users.map(serializeUser), meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize), sort: query.sort } };
}

export async function getUser(id: string): Promise<UserResponse> {
  const user = await UserModel.findOne({ id }).lean<UserRecord>();
  if (!user) throw new AppError(404, "user-not-found", "User tidak ditemukan.");
  return serializeUser(user);
}

// Field yang dicatat di audit log. passwordHash/tokenVersion sengaja tidak pernah ikut.
const auditFields = (user: Pick<UserRecord, "name" | "phone" | "role" | "isActive">) => ({ name: user.name, phone: user.phone, role: user.role, isActive: user.isActive });

export async function createManagedUser(input: { name: string; email: string; phone?: string | null; role: "STAFF" | "ORGANIZER"; password: string }, audit: AuditContext): Promise<UserResponse> {
  const email = input.email.trim().toLowerCase();
  if (await UserModel.exists({ email })) throw new AppError(409, "email-taken", "Email sudah digunakan.");
  const created = await UserModel.create({
    id: uuidv7(), name: input.name.trim(), email, phone: input.phone ?? null,
    passwordHash: await bcrypt.hash(input.password, 12), role: input.role,
    isActive: true, emailVerified: true, tokenVersion: 0, version: 1, createdAt: now(), updatedAt: now(),
  });
  const record = created.toObject() as UserRecord;
  await recordAudit(audit, { action: "USER_CREATED", entityType: "User", entityId: record.id, after: { email: record.email, ...auditFields(record) } });
  return serializeUser(record);
}

export async function updateManagedUser(audit: AuditContext, id: string, header: string | undefined, input: { name?: string; phone?: string | null; role?: UserRole; isActive?: boolean }): Promise<UserResponse> {
  const current = await requireCurrentVersion(id, header);
  if (audit.actorId === id && (input.role !== undefined || input.isActive !== undefined)) throw new AppError(409, "cannot-modify-self", "Organizer tidak dapat mengubah peran atau status dirinya sendiri.");
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
  if (!updated) throw preconditionFailed(await getUser(id));
  if (input.role !== undefined && input.role !== current.role && current.role === "STAFF") await EventStaff.deleteMany({ userId: id });
  // Satu entri per aksi yang paling spesifik (kontrak §9.14); perubahan nama/phone saja → USER_UPDATED.
  const action = input.isActive === false && current.isActive ? "USER_DEACTIVATED"
    : input.isActive === true && !current.isActive ? "USER_REACTIVATED"
    : input.role !== undefined && input.role !== current.role ? "USER_ROLE_CHANGED"
    : "USER_UPDATED";
  await recordAudit(audit, { action, entityType: "User", entityId: id, before: auditFields(current), after: auditFields(updated) });
  return serializeUser(updated);
}
/**
 * Halaman tiket hanya untuk ATTENDEE. Akun yang masih punya tiket aktif atau pesanan belum dibayar
 * tidak boleh menjadi ORGANIZER, supaya tiketnya tidak hilang dari jangkauan pemiliknya.
 */
export async function assertNoActivePurchases(userId: string): Promise<void> {
  const [tickets, pending] = await Promise.all([
    Ticket.countDocuments({ ownerId: userId, status: "VALID" }),
    Order.countDocuments({ userId, status: "PENDING_PAYMENT" }),
  ]);
  if (tickets > 0 || pending > 0) {
    throw new AppError(409, "organizer-request-has-purchases", "Akun ini masih punya tiket aktif atau pesanan yang belum dibayar. Gunakan akun lain untuk menjadi penyelenggara, atau tunggu sampai acaranya selesai.");
  }
}

/** Hanya ORGANIZER aktif dengan penanda superadmin yang boleh meninjau pengajuan; selain itu 403. */
export async function assertSuperAdmin(actorId: string): Promise<void> {
  const actor = await UserModel.findOne({ id: actorId, role: "ORGANIZER", isActive: true, isSuperAdmin: true }).select({ id: 1 }).lean();
  if (!actor) throw new AppError(403, "superadmin-required", "Hanya superadmin yang dapat meninjau pengajuan penyelenggara.");
}

/** Daftar pengajuan penyelenggara yang menunggu keputusan, terlama di atas (kontrak §9.15). */
export async function listOrganizerRequests(): Promise<UserResponse[]> {
  const users = await UserModel.find({ role: "ATTENDEE", "organizerRequest.status": "PENDING" }).sort({ "organizerRequest.requestedAt": 1 }).limit(100).lean<UserRecord[]>();
  return users.map(serializeUser);
}

/**
 * Menyetujui atau menolak pengajuan. Kondisional pada status PENDING sehingga dua penyelenggara yang
 * memutuskan bersamaan tidak saling menimpa. Disetujui: peran menjadi ORGANIZER dan tokenVersion naik,
 * jadi sesi lama dikeluarkan dan pengguna masuk ulang dengan peran baru.
 */
export async function decideOrganizerRequest(audit: AuditContext, id: string, decision: "APPROVE" | "REJECT", note: string | null): Promise<UserResponse> {
  const current = await UserModel.findOne({ id }).lean<UserRecord>();
  if (!current || !current.organizerRequest) throw new AppError(404, "organizer-request-not-found", "Pengajuan tidak ditemukan.");
  if (current.organizerRequest.status !== "PENDING" || current.role !== "ATTENDEE") throw new AppError(409, "organizer-request-decided", "Pengajuan ini sudah diputuskan.");
  const at = now();
  const set: Record<string, unknown> = {
    "organizerRequest.status": decision === "APPROVE" ? "APPROVED" : "REJECTED",
    "organizerRequest.decidedAt": at,
    "organizerRequest.decidedBy": audit.actorId,
    "organizerRequest.note": note,
    updatedAt: at,
    version: current.version + 1,
  };
  // Naik hak akses tidak perlu mencabut sesi: peran dibaca dari DB tiap request, jadi cukup muat ulang halaman.
  if (decision === "APPROVE") {
    await assertNoActivePurchases(id);
    set.role = "ORGANIZER";
  }
  const updated = await UserModel.findOneAndUpdate({ id, role: "ATTENDEE", "organizerRequest.status": "PENDING" }, { $set: set }, { new: true }).lean<UserRecord>();
  if (!updated) throw new AppError(409, "organizer-request-decided", "Pengajuan ini sudah diputuskan.");
  await recordAudit(audit, {
    action: decision === "APPROVE" ? "ORGANIZER_REQUEST_APPROVED" : "ORGANIZER_REQUEST_REJECTED",
    entityType: "User",
    entityId: id,
    before: { role: current.role, organizerRequest: "PENDING" },
    after: { role: updated.role, organizerRequest: updated.organizerRequest?.status, organization: current.organizerRequest.organization, note },
  });
  return serializeUser(updated);
}
