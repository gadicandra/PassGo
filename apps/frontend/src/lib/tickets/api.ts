import type { Ticket } from "@/types/api";
import { ApiError, apiFetch, refreshSession } from "@/lib/api/client";
import type { AttendanceReport, AttendeePage, CheckInPage, TicketPage } from "./types";

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function listMyTickets(params: { when: "upcoming" | "past" | "all"; status?: string; cursor?: string }) {
  return apiFetch<TicketPage>(`/tickets${query({ ...params, limit: 20 })}`, { envelope: true });
}

export function getTicket(ticketId: string) {
  return apiFetch<Ticket>(`/tickets/${ticketId}`);
}

export function renameTicket(ticketId: string, version: number, holderName: string) {
  return apiFetch<Ticket>(`/tickets/${ticketId}`, { method: "PATCH", body: { holderName }, version });
}

export interface AttendeeQuery {
  status: string;
  ticketTypeId?: string;
  q?: string;
  sort: string;
  page: number;
}

export function listAttendees(eventId: string, params: AttendeeQuery) {
  return apiFetch<AttendeePage>(`/events/${eventId}/attendees${query({ ...params, pageSize: 20 })}`, { envelope: true });
}

export function getAttendanceReport(eventId: string) {
  return apiFetch<AttendanceReport>(`/events/${eventId}/reports/attendance`);
}

export async function findRevertibleCheckIn(eventId: string, ticketId: string) {
  const page = await apiFetch<CheckInPage>(`/events/${eventId}/check-ins${query({ ticketId, result: "ACCEPTED", limit: 5 })}`, { envelope: true });
  return page.data.find((row) => row.revertedAt === null) ?? null;
}

export function revertCheckIn(eventId: string, checkInId: string, reason: string) {
  return apiFetch(`/events/${eventId}/check-ins/${checkInId}/revert`, { method: "POST", body: { reason } });
}

export function reissueTicket(ticketId: string, version: number, reason: string) {
  return apiFetch(`/tickets/${ticketId}/reissue`, { method: "POST", body: { reason }, version });
}

export async function downloadAttendees(eventId: string, format: "csv" | "xlsx"): Promise<string> {
  const session = await refreshSession();
  if (!session) throw new ApiError(401, { title: "Unauthorized", status: 401, code: "unauthenticated", detail: "Sesi berakhir. Masuk lagi." });
  const response = await fetch(`/api/v1/events/${eventId}/attendees/export${query({ format })}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    credentials: "same-origin",
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(response.status, problem ?? { title: response.statusText, status: response.status, code: "export-failed" });
  }
  const filename = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `peserta.${format}`;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}
