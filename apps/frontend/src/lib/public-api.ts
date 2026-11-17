// Pembacaan data publik dari Server Component (katalog & detail acara), tanpa token.
// Server tidak lewat rewrite Next, jadi panggil backend langsung via BACKEND_URL.
// Untuk request dari browser yang butuh login, pakai API client di lib/api (Adi).

import type { Event, EventSummary, ProblemDetails } from "@/types/api";

const backend = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

export class PublicApiError extends Error {
  constructor(
    public status: number,
    public problem: ProblemDetails | null,
  ) {
    super(problem?.detail ?? `Request gagal (${status})`);
  }
}

async function get<T>(path: string, revalidate = 30): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backend}/api/v1${path}`, { next: { revalidate } });
  } catch {
    throw new PublicApiError(503, null);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
    throw new PublicApiError(response.status, problem);
  }
  return response.json() as Promise<T>;
}

export interface EventListQuery {
  q?: string;
  when?: "upcoming" | "past" | "all";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface EventPage {
  data: EventSummary[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export function listEvents(query: EventListQuery = {}): Promise<EventPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return get<EventPage>(`/events?${params}`);
}

/** null kalau acara tidak ada atau masih draf (backend menjawab 404). */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    const { data } = await get<{ data: Event }>(`/events/by-slug/${encodeURIComponent(slug)}`);
    return data;
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) return null;
    throw error;
  }
}
