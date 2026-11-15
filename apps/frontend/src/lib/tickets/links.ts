import type { Role } from "@/types/api";

export function eventLinks(role: Role | undefined, eventId: string) {
  const base = role === "ORGANIZER" ? `/organizer/events/${eventId}` : `/staff/${eventId}`;
  return {
    attendance: role === "ORGANIZER" ? `${base}/attendance` : base,
    attendees: `${base}/attendees`,
    scan: `/scan/${eventId}`,
  };
}
