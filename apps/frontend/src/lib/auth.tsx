"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "@/types/api";
import { api, onSessionChange, refreshSession, setSession, type Session } from "./api";

type Status = "loading" | "authenticated" | "guest";

interface AuthValue {
  status: Status;
  user: User | null;
  login(email: string, password: string): Promise<User>;
  /** Simpan sesi baru dari response berbentuk login (mis. POST /me/password). */
  applySession(session: Session): void;
  /** Ganti data user di memori setelah PATCH /me. */
  setUser(user: User): void;
  logout(options?: { all?: boolean }): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("passgo-auth");

/** Dipasang sekali di root layout, di dalam ToastProvider. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    onSessionChange((session) => {
      setUserState(session?.user ?? null);
      setStatus(session ? "authenticated" : "guest");
    });
    // Reload/tab baru: access token hilang dari memori, pulihkan dari cookie refresh.
    refreshSession().catch(() => setStatus("guest"));
    // Logout/login di tab lain → ikuti.
    if (channel) channel.onmessage = (event) => (event.data === "logout" ? setSession(null) : refreshSession().catch(() => {}));
  }, []);

  const applySession = useCallback((session: Session) => {
    setSession(session);
    channel?.postMessage("login");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await api<Session>("/auth/login", { method: "POST", body: { email, password } });
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const logout = useCallback(async ({ all = false } = {}) => {
    try {
      await api(all ? "/auth/logout-all" : "/auth/logout", { method: "POST" });
    } finally {
      // Bila logout-all gagal (jaringan/token dicabut), cookie refresh tetap dihapus lewat logout biasa.
      if (all) await api("/auth/logout", { method: "POST" }).catch(() => {});
      setSession(null);
      channel?.postMessage("logout");
    }
  }, []);

  const setUser = useCallback((next: User) => setUserState(next), []);

  const value = useMemo(
    () => ({ status, user, login, applySession, setUser, logout }),
    [status, user, login, applySession, setUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return value;
}

/** Halaman tujuan setelah login per peran. */
export function homeFor(role: Role) {
  if (role === "ORGANIZER") return "/organizer/users";
  if (role === "STAFF") return "/staff";
  return "/";
}

/** Hanya terima path internal untuk ?next= (cegah open redirect ke domain lain). */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * Bungkus isi halaman yang butuh login. Tanpa `roles` = peran apa pun.
 * ponytail: guard di klien saja; data tetap dilindungi backend (401/403/404). Tambah proxy.ts bila perlu blokir SSR.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = status === "authenticated" && (!roles || roles.includes(user!.role));

  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && !allowed) router.replace(homeFor(user!.role));
  }, [status, allowed, user, router, pathname]);

  if (!allowed) {
    return (
      <div className="mx-auto flex w-full max-w-[1200px] justify-center px-4 py-24" aria-busy>
        <span className="size-6 animate-spin rounded-full border-2 border-navy border-r-transparent" aria-hidden />
        <span className="sr-only">Memuat…</span>
      </div>
    );
  }
  return children;
}
