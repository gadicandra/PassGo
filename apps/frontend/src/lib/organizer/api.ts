// Panggilan API untuk halaman kelola acara organizer (kontrak §9.5–9.7, §9.13).
// Semua lewat klien bersama (@/lib/api) supaya token, refresh, dan X-If-Match ditangani di satu tempat.
//
// Catatan backend saat ini (beda dengan kontrak):
// - GET /events untuk organizer mengembalikan objek Event lengkap (termasuk ticketTypes & version), `stats` tidak ada.
//   Angka terjual dihitung dari ticketTypes, lihat `ticketTotals`.
// - `createdBy` berupa id string, bukan UserRef. Tidak dipakai di UI.

import type { Event, OrderStatus, StaffAssignment, TicketType, User } from "@/types/api";
import { api, apiEnvelope } from "@/lib/api";

/** Satu key per aksi pengguna; dipakai ulang untuk retry aksi yang sama. */
export const newIdempotencyKey = () => crypto.randomUUID();

export interface EventPage {
  data: Event[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface EventBody {
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  checkInOpensAt: string | null;
  capacity: number | null;
  maxTicketsPerUser: number | null;
}

export interface TicketTypeBody {
  name: string;
  description: string | null;
  price: number;
  quota: number;
  salesStartAt: string;
  salesEndAt: string;
  maxPerOrder: number;
  isActive: boolean;
  sortOrder: number;
}

export interface CancelResult {
  event: Event;
  affected: { pendingOrdersCancelled: number; paidOrdersRequiringRefund: number; ticketsVoided: number };
}

export interface SalesReport {
  eventId: string;
  timezone: string;
  totals: {
    quota: number;
    ticketsSold: number;
    ticketsReserved: number;
    ticketsAvailable: number;
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    ordersByStatus: Record<OrderStatus, number>;
    refundsRequired: number;
  };
  byTicketType: Array<{
    ticketTypeId: string;
    ticketTypeName: string;
    price: number;
    quota: number;
    ticketsSold: number;
    ticketsReserved: number;
    ticketsAvailable: number;
    grossRevenue: number;
  }>;
  daily: Array<{ date: string; ordersPaid: number; ticketsSold: number; grossRevenue: number }>;
}

const path = (eventId: string) => `/events/${encodeURIComponent(eventId)}`;

// Acara

export function listOrganizerEvents(params: { status?: string; when?: "upcoming" | "past" | "all"; q?: string; page?: number }) {
  const query = new URLSearchParams({ when: params.when ?? "all", pageSize: "100", sort: "-startAt" });
  if (params.status) query.set("status", params.status);
  if (params.q && params.q.trim().length >= 2) query.set("q", params.q.trim());
  if (params.page) query.set("page", String(params.page));
  return apiEnvelope<Event[], EventPage["meta"]>(`/events?${query}`) as Promise<EventPage>;
}

export const getEvent = (eventId: string) => api<Event>(path(eventId));

export const createEvent = (body: EventBody) => api<Event>("/events", { method: "POST", body });

export const updateEvent = (event: Event, patch: Partial<EventBody>) =>
  api<Event>(path(event.id), { method: "PATCH", body: patch, version: event.version ?? 0 });

export const deleteEvent = (event: Event) =>
  api(path(event.id), { method: "DELETE", version: event.version ?? 0 });

export const publishEvent = (event: Event) =>
  api<Event>(`${path(event.id)}/publish`, { method: "POST", version: event.version ?? 0 });

/** `idempotencyKey` dibuat sekali per dialog pembatalan, dipakai ulang kalau pengguna menekan "Coba lagi". */
export const cancelEvent = (event: Event, reason: string, idempotencyKey = newIdempotencyKey()) =>
  api<CancelResult>(`${path(event.id)}/cancel`, {
    method: "POST",
    body: { reason },
    version: event.version ?? 0,
    idempotencyKey,
  });

export function uploadPoster(event: Event, file: File) {
  const form = new FormData();
  form.append("poster", file);
  return api<Event>(`${path(event.id)}/poster`, { method: "PUT", body: form, version: event.version ?? 0 });
}

export const deletePoster = (event: Event) =>
  api<Event>(`${path(event.id)}/poster`, { method: "DELETE", version: event.version ?? 0 });

// Tipe tiket

export const listTicketTypes = (eventId: string) => api<TicketType[]>(`${path(eventId)}/ticket-types`);

export const createTicketType = (eventId: string, body: TicketTypeBody) =>
  api<TicketType>(`${path(eventId)}/ticket-types`, { method: "POST", body });

export const updateTicketType = (type: TicketType, patch: Partial<TicketTypeBody>) =>
  api<TicketType>(`${path(type.eventId)}/ticket-types/${type.id}`, { method: "PATCH", body: patch, version: type.version ?? 0 });

export const deleteTicketType = (type: TicketType) =>
  api(`${path(type.eventId)}/ticket-types/${type.id}`, { method: "DELETE", version: type.version ?? 0 });

// Panitia

export const listEventStaff = (eventId: string) => api<StaffAssignment[]>(`${path(eventId)}/staff`);

export const assignStaff = (eventId: string, userId: string) =>
  api<StaffAssignment>(`${path(eventId)}/staff/${encodeURIComponent(userId)}`, { method: "PUT" });

export const removeStaff = (eventId: string, userId: string) =>
  api(`${path(eventId)}/staff/${encodeURIComponent(userId)}`, { method: "DELETE" });

/** Semua akun STAFF aktif (maks. 100, cukup untuk satu komunitas). */
export const listActiveStaffUsers = () => api<User[]>("/users?role=STAFF&isActive=true&pageSize=100&sort=name");

// Laporan

export const getSalesReport = (eventId: string) =>
  apiEnvelope<SalesReport, { generatedAt: string }>(`${path(eventId)}/reports/sales`) as Promise<{ data: SalesReport; meta: { generatedAt: string } }>;

// Turunan

/** Terjual / dipesan / kuota dari tipe tiket, karena `stats` belum dikirim backend. */
export function ticketTotals(event: Pick<Event, "ticketTypes" | "stats">) {
  if (event.stats) return { sold: event.stats.ticketsSold, reserved: event.stats.ticketsReserved, quota: event.stats.totalQuota };
  const types = event.ticketTypes ?? [];
  return {
    sold: types.reduce((sum, type) => sum + (type.soldCount ?? 0), 0),
    reserved: types.reduce((sum, type) => sum + (type.reservedCount ?? 0), 0),
    quota: types.reduce((sum, type) => sum + type.quota, 0),
  };
}

/** Acara masih bisa diubah (form, poster, tipe tiket): belum batal dan belum berakhir. */
export const isEditable = (event: Pick<Event, "status" | "isEnded">) => event.status !== "CANCELLED" && !event.isEnded;
