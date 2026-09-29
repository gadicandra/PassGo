import { Event, EventStaff, User } from "../models";
import { AppError } from "../utils/app-error";
import { uuidv7 } from "../utils/uuid";

const now = () => new Date();

function userReference(user: any) {
  return { id: user.id, name: user.name, email: user.email };
}

export async function listEventStaff(eventId: string) {
  const event = await Event.findOne({ id: eventId }).lean();
  if (!event) throw new AppError(404, "event-not-found", "Acara tidak ditemukan.");
  const assignments: any[] = await EventStaff.find({ eventId }).sort({ assignedAt: 1 }).lean();
  const userIds = [...new Set(assignments.flatMap((assignment) => [assignment.userId, assignment.assignedBy]))];
  const users: any[] = await User.find({ id: { $in: userIds } }).lean();
  const byId = new Map(users.map((user) => [user.id, user]));
  return assignments.map((assignment) => ({ eventId, user: userReference(byId.get(assignment.userId)), assignedBy: userReference(byId.get(assignment.assignedBy)), assignedAt: assignment.assignedAt }));
}

export async function assignEventStaff(eventId: string, userId: string, assignedBy: string): Promise<{ status: 200 | 201; assignment: unknown }> {
  const event: any = await Event.findOne({ id: eventId }).lean();
  if (!event || event.status !== "PUBLISHED" || event.endAt <= now()) throw new AppError(409, "event-not-editable", "Acara tidak dapat diubah.");
  const user: any = await User.findOne({ id: userId, role: "STAFF", isActive: true }).lean();
  if (!user) throw new AppError(422, "user-not-staff", "User bukan STAFF aktif.");
  const assigningUser: any = await User.findOne({ id: assignedBy }).lean();
  const existing: any = await EventStaff.findOne({ eventId, userId }).lean();
  if (existing) return { status: 200, assignment: { eventId, user: userReference(user), assignedBy: userReference(assigningUser), assignedAt: existing.assignedAt } };
  const created: any = await EventStaff.create({ id: uuidv7(), eventId, userId, assignedBy, assignedAt: now() });
  return { status: 201, assignment: { eventId, user: userReference(user), assignedBy: userReference(assigningUser), assignedAt: created.assignedAt } };
}

export async function removeEventStaff(eventId: string, userId: string): Promise<void> {
  await EventStaff.deleteOne({ eventId, userId });
}