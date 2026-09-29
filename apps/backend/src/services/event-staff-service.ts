import { Event, EventStaff, User } from "../models";
import { AppError } from "../utils/app-error";
import { uuidv7 } from "../utils/uuid";
import type { UserRecord } from "./auth-repository";

const now = () => new Date();

interface EventRecord { id: string; status: "DRAFT" | "PUBLISHED" | "CANCELLED"; endAt: Date }
interface AssignmentRecord { eventId: string; userId: string; assignedBy: string; assignedAt: Date }
type UserSummary = Pick<UserRecord, "id" | "name" | "email">;

function userReference(user: UserSummary | null | undefined) {
  if (!user) throw new AppError(500, "internal-error", "Referensi user assignment tidak ditemukan.");
  return { id: user.id, name: user.name, email: user.email };
}

export async function listEventStaff(eventId: string) {
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  const assignments = await EventStaff.find({ eventId }).sort({ assignedAt: 1 }).lean<AssignmentRecord[]>();
  const userIds = [...new Set(assignments.flatMap((assignment) => [assignment.userId, assignment.assignedBy]))];
  const users = await User.find({ id: { $in: userIds } }).lean<UserSummary[]>();
  const byId = new Map(users.map((user) => [user.id, user]));
  return assignments.map((assignment) => ({ eventId, user: userReference(byId.get(assignment.userId)), assignedBy: userReference(byId.get(assignment.assignedBy)), assignedAt: assignment.assignedAt }));
}

export async function assignEventStaff(eventId: string, userId: string, assignedBy: string): Promise<{ status: 200 | 201; assignment: unknown }> {
  const event = await Event.findOne({ id: eventId }).lean<EventRecord>();
  if (!event || event.status !== "PUBLISHED" || event.endAt <= now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  const user = await User.findOne({ id: userId, role: "STAFF", isActive: true }).lean<UserSummary>();
  if (!user) throw new AppError(422, "user-not-staff", "User bukan STAFF aktif.");
  const assigningUser = await User.findOne({ id: assignedBy }).lean<UserSummary>();
  const existing = await EventStaff.findOne({ eventId, userId }).lean<AssignmentRecord>();
  if (existing) return { status: 200, assignment: { eventId, user: userReference(user), assignedBy: userReference(assigningUser), assignedAt: existing.assignedAt } };
  const created = await EventStaff.create({ id: uuidv7(), eventId, userId, assignedBy, assignedAt: now() });
  return { status: 201, assignment: { eventId, user: userReference(user), assignedBy: userReference(assigningUser), assignedAt: created.assignedAt } };
}

export async function removeEventStaff(eventId: string, userId: string): Promise<void> {
  await EventStaff.deleteOne({ eventId, userId });
}