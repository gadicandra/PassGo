import { Event, EventStaff, User } from "../models";
import { AppError } from "../utils/app-error";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export interface AccessEvent { id: string; title: string; slug: string; status: EventStatus; startAt: Date; endAt: Date; checkInOpensAt: Date | null; timezone: string }
export interface Viewer { sub: string; role: "ORGANIZER" | "STAFF" | "ATTENDEE" }

const eventNotFound = () => new AppError(404, "event-not-found", "Acara tidak ditemukan.");

// 🧑‍💼: ORGANIZER, atau STAFF yang ditugaskan. Staff yang tidak ditugaskan mendapat 404 agar keberadaan acara tidak bocor.
export async function assertEventAccess(eventId: string, viewer: Viewer): Promise<AccessEvent> {
  const event = await Event.findOne({ id: eventId }).lean<AccessEvent>();
  if (!event) throw eventNotFound();
  if (viewer.role === "ORGANIZER") return event;
  if (viewer.role === "STAFF" && event.status !== "DRAFT" && await EventStaff.exists({ eventId, userId: viewer.sub })) return event;
  throw eventNotFound();
}

export function effectiveCheckInOpensAt(event: Pick<AccessEvent, "startAt" | "checkInOpensAt">): Date {
  return event.checkInOpensAt ?? new Date(event.startAt.getTime() - 2 * 60 * 60 * 1000);
}

export async function userRefs(ids: Array<string | null | undefined>) {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const users = wanted.length ? await User.find({ id: { $in: wanted } }).select({ id: 1, name: 1 }).lean<Array<{ id: string; name: string }>>() : [];
  const byId = new Map(users.map((user) => [user.id, { id: user.id, name: user.name }]));
  return (id: string | null | undefined) => (id ? byId.get(id) ?? null : null);
}
