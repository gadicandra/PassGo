// Klien API PassGo. Semua halaman memanggil backend lewat sini, jangan fetch langsung.
// - Access token hanya di memori (kontrak §2.2); sesi dipulihkan dari cookie refresh lewat refreshSession().
// - 401 token-expired → refresh sekali (single-flight, lintas tab via Web Locks) → ulang request.
// - Error selalu dilempar sebagai ApiError berisi Problem Details (kontrak §3).

import type { ProblemDetails, User } from "@/types/api";

const BASE = "/api/v1";

export interface Session {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}

export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
  }
  get status() {
    return this.problem.status;
  }
  get code() {
    return this.problem.code;
  }
  /** errors[].pointer "#/email" → { email: "…" }, untuk prop `error` di <Field>. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const item of this.problem.errors ?? []) {
      const key = item.pointer?.replace(/^#?\//, "").split("/")[0];
      if (key && !out[key]) out[key] = item.detail;
    }
    return out;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** `version` resource untuk endpoint 🔒. Dikirim sebagai X-If-Match (If-Match ditolak edge Vercel, kontrak §6). */
  version?: number;
  /** Wajib untuk endpoint 🔁. Buat satu per aksi pengguna: crypto.randomUUID(). */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface Envelope<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
}

let accessToken: string | null = null;
let listener: (session: Session | null) => void = () => {};

/** Dipakai AuthProvider. Satu pendengar cukup: hanya provider yang perlu tahu. */
export function onSessionChange(fn: (session: Session | null) => void) {
  listener = fn;
}

export function setSession(session: Session | null) {
  accessToken = session?.accessToken ?? null;
  listener(session);
}

async function send<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T> | undefined> {
  const url = new URL(BASE + path, "http://x");
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { "X-Requested-With": "fetch" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.version !== undefined) headers["X-If-Match"] = `"${options.version}"`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(url.pathname + url.search, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError({ title: "Network error", status: 0, code: "network-error", detail: "Tidak bisa terhubung ke server. Periksa koneksi internet." });
  }

  if (response.status === 204) return undefined;
  const isJson = /json/.test(response.headers.get("content-type") ?? "");
  const body = isJson ? await response.json().catch(() => null) : null;
  if (response.ok) return body as Envelope<T>;
  throw new ApiError(
    body?.code
      ? (body as ProblemDetails)
      : { title: response.statusText, status: response.status, code: `http-${response.status}`, detail: "Terjadi kesalahan pada server. Coba lagi." },
  );
}

let refreshing: Promise<Session | null> | null = null;

/** Tukar cookie refresh dengan access token baru. null = tidak ada sesi (tamu). */
export function refreshSession(): Promise<Session | null> {
  refreshing ??= withRefreshLock(() => send<Session>("/auth/refresh", { method: "POST" }))
    .then(
      (envelope) => {
        const session = envelope!.data;
        setSession(session);
        return session;
      },
      (error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setSession(null);
          return null;
        }
        throw error;
      },
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Lintas tab: tab kedua menunggu tab pertama selesai merotasi cookie, lalu memakai cookie barunya.
// Tanpa Web Locks (browser lama) masih aman berkat grace period 10 detik di server (kontrak §2.3).
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return fn();
  return navigator.locks.request("passgo-refresh", fn) as Promise<T>;
}

const SESSION_GONE = new Set(["token-revoked", "token-invalid", "refresh-token-invalid", "refresh-token-reused"]);

/** Request lengkap dengan `meta` (untuk list ber-pagination). */
export async function apiEnvelope<T, M = Record<string, unknown>>(path: string, options?: RequestOptions): Promise<Envelope<T, M>> {
  const hadToken = accessToken !== null;
  try {
    return (await send<T>(path, options)) as Envelope<T, M>;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !hadToken) throw error;
    if (error.code === "token-expired" && (await refreshSession())) return (await send<T>(path, options)) as Envelope<T, M>;
    if (SESSION_GONE.has(error.code)) setSession(null);
    throw error;
  }
}

/** Request yang hanya butuh `data`. Untuk 202/204 hasilnya undefined. */
export async function api<T = undefined>(path: string, options?: RequestOptions): Promise<T> {
  return (await apiEnvelope<T>(path, options))?.data as T;
}

/** Error validasi di sisi klien; pesannya aman ditampilkan apa adanya. */
export class UserError extends Error {}

/** Pesan yang bisa langsung ditampilkan dari error apa pun. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof UserError) return error.message;
  return "Terjadi kesalahan. Coba lagi.";
}

/** Hanya terima path internal untuk ?next= (cegah open redirect ke domain lain). */
export function safeNext(next: string | null | undefined) {
  if (!next?.startsWith("/")) return null;
  // Parse seperti browser: "//x", "/\\x", "/\t/x" semuanya pindah host. Terima hanya bila origin tetap.
  const url = new URL(next, "https://passgo.invalid");
  return url.origin === "https://passgo.invalid" ? url.pathname + url.search + url.hash : null;
}
