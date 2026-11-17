import type { Attendee, CheckIn, CheckInResult, Ticket } from "@/types/api";

export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OffsetMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketPage {
  data: Ticket[];
  meta: CursorMeta;
}

export interface AttendeePage {
  data: Attendee[];
  meta: OffsetMeta & { counts: { valid: number; checkedIn: number; void: number } };
}

export interface CheckInPage {
  data: CheckIn[];
  meta: CursorMeta;
}

export interface AttendanceReport {
  eventId: string;
  ticketsValid: number;
  ticketsCheckedIn: number;
  ticketsVoid: number;
  byTicketType: Array<{ ticketTypeId: string; ticketTypeName: string; ticketsIssued: number; ticketsCheckedIn: number }>;
  rejectedScans: Record<Exclude<CheckInResult, "ACCEPTED">, number>;
  lastCheckInAt: string | null;
}
