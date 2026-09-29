import bcrypt from "bcryptjs";
import { Event, EventStaff, Ticket, TicketType } from "../models";
import { createAccessToken } from "../lib/auth-tokens";
import { UserModel, type UserRecord } from "./auth-repository";
import { getUserById, issueRefreshToken, revokeAllSessions, serializeUser } from "./auth-service";
import { AppError } from "../utils/app-error";

function now(): Date { return new Date(); }

function ifMatchVersion(header: string | undefined): number {
  const match = /^"(\d+)"$/.exec(header ?? "");
  if (!match || header === "*") throw new AppError(428, "precondition-required", "If-Match wajib dikirim.");
  return Number(match[1]);
}

export async function getMe(userId: string): Promise<UserRecord> {
  const user = await getUserById(userId);
  if (!user) throw new AppError(404, "user-not-found", "User tidak ditemukan.");
  return user;
}

export async function updateMe(userId: string, ifMatch: string | undefined, input: { name?: string; phone?: string | null }): Promise<UserRecord> {
  const version = ifMatchVersion(ifMatch);
  const user = await getMe(userId);
  if (user.version !== version) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.", { current: serializeUser(user) });
  const updated = await UserModel.findOneAndUpdate(
    { id: userId, version },
    { $set: { ...input, updatedAt: now(), version: version + 1 } },
    { new: true },
  ).lean<UserRecord>();
  if (!updated) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.");
  return updated;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ user: UserRecord; accessToken: string; refreshToken: string }> {
  const user = await getMe(userId);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(422, "current-password-invalid", "Password saat ini tidak valid.");
  const updated = await UserModel.findOneAndUpdate(
    { id: userId, version: user.version },
    { $set: { passwordHash: await bcrypt.hash(newPassword, 12), updatedAt: now(), version: user.version + 1 }, $inc: { tokenVersion: 1 } },
    { new: true },
  ).lean<UserRecord>();
  if (!updated) throw new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.");
  await revokeAllSessions(userId);
  const refreshed = await getMe(userId);
  return { user: refreshed, accessToken: createAccessToken(refreshed), refreshToken: await issueRefreshToken(refreshed, {}) };
}

export async function assignedEvents(userId: string, when: "upcoming" | "past" | "all"): Promise<unknown[]> {
  const assignments = await EventStaff.find({ userId }).lean();
  const eventIds = assignments.map((assignment) => assignment.eventId);
  const dateFilter = when === "upcoming" ? { endAt: { $gte: now() } } : when === "past" ? { endAt: { $lt: now() } } : {};
  const events = await Event.find({ id: { $in: eventIds }, status: { $in: ["PUBLISHED", "CANCELLED"] }, ...dateFilter }).sort({ startAt: 1 }).lean<Array<{
    id: string; slug: string; title: string; startAt: Date; endAt: Date; timezone: string; venueName: string; posterUrl: string | null; status: "PUBLISHED" | "CANCELLED";
  }>>();
  return Promise.all(events.map(async (event) => {
    const [ticketTypes, ticketsSold, checkedIn] = await Promise.all([
      TicketType.find({ eventId: event.id }).select({ quota: 1, reservedCount: 1 }).lean<Array<{ quota: number; reservedCount: number }>>(),
      Ticket.countDocuments({ eventId: event.id, status: { $in: ["VALID", "CHECKED_IN"] } }),
      Ticket.countDocuments({ eventId: event.id, status: "CHECKED_IN" }),
    ]);
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      timezone: event.timezone,
      venueName: event.venueName,
      posterUrl: event.posterUrl,
      status: event.status,
      isEnded: event.endAt < now(),
      priceFrom: null,
      salesStatus: event.status === "CANCELLED" ? "ENDED" : "ON_SALE",
      stats: { ticketsSold, ticketsReserved: ticketTypes.reduce((sum, item) => sum + (item.reservedCount ?? 0), 0), totalQuota: ticketTypes.reduce((sum, item) => sum + item.quota, 0), checkedIn },
    };
  }));
}