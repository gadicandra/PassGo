// API client untuk request dari browser (butuh login). Sementara ditulis Marcel supaya alur beli bisa jalan;
// Adi boleh mengganti isinya selama bentuk export (apiFetch, ApiError, setAccessToken, refreshSession) tetap.
//
// Aturan dari docs/api-contract.md §2:
// - Access token hanya di memori (bukan localStorage).
// - Refresh lewat cookie HttpOnly, single-flight: banyak request 401 berbarengan cukup memicu satu refresh.
// - 401 token-expired → refresh lalu ulangi sekali. token-revoked / refresh-token-* → sesi berakhir.

import type { ProblemDetails, User } from "@/types/api";

const BASE = "/api/v1";

let accessToken: string | null = null;
let refreshing: Promise<SessionResult | null> | null = null;
const listeners = new Set<(user: User | null) => void>();

export interface SessionResult {
  accessToken: string;
  user: User;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: ProblemDetails,
  ) {
    super(problem.detail ?? problem.title);
  }
  get code() {
    return this.problem.code;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Dipanggil AuthProvider supaya tahu kalau sesi berakhir di tengah jalan. */
export function onSessionChange(listener: (user: User | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(user: User | null) {
  for (const listener of listeners) listener(user);
}

/** Tukar cookie refresh dengan access token baru. null = tidak ada sesi. */
export function refreshSession(): Promise<SessionResult | null> {
  refreshing ??= (async () => {
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!response.ok) {
        setAccessToken(null);
        return null;
      }
      const { data } = (await response.json()) as { data: SessionResult };
      setAccessToken(data.accessToken);
      notify(data.user);
      return data;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Wajib untuk endpoint 🔁 (POST /orders, refund). Pakai key yang sama untuk retry aksi yang sama. */
  idempotencyKey?: string;
  /** Versi resource untuk endpoint 🔒. */
  version?: number;
  /** true = kembalikan respons utuh { data, meta } (untuk list ber-pagination), bukan hanya `data`. */
  envelope?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  if (options.version !== undefined) {
    headers["If-Match"] = `"${options.version}"`;
    headers["X-If-Match"] = `"${options.version}"`; // edge Vercel menelan If-Match, backend juga membaca header ini
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, { title: "Network error", status: 0, code: "network-error", detail: "Tidak ada koneksi. Coba lagi." });
  }

  if (response.status === 204 || response.status === 202) {
    return (response.status === 202 ? ((await response.json().catch(() => ({}))) as { data: T }).data : undefined) as T;
  }

  const json = await response.json().catch(() => null);
  if (response.ok) return options.envelope ? (json as T) : ((json as { data: T }).data ?? (json as T));

  const problem: ProblemDetails = json ?? { title: response.statusText, status: response.status, code: "unknown-error" };

  if (response.status === 401 && !retried) {
    // "unauthenticated" = token belum ada di memori (mis. habis reload), coba pulihkan dari cookie refresh.
    if (problem.code === "token-expired" || problem.code === "unauthenticated") {
      const session = await refreshSession();
      if (session) return apiFetch<T>(path, options, true);
    }
    setAccessToken(null);
    notify(null);
  }
  throw new ApiError(response.status, problem);
}

/** Satu key per aksi pengguna (mis. per klik "Bayar"). */
export function newIdempotencyKey() {
  return crypto.randomUUID();
}
