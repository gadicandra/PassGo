"use client";

// Status login untuk seluruh aplikasi. Sementara ditulis Marcel; Adi boleh mengganti isinya
// selama useAuth() tetap mengembalikan { status, user, login, logout, requireLogin }.

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "@/types/api";
import { apiFetch, onSessionChange, refreshSession, setAccessToken, type SessionResult } from "./client";

type Status = "loading" | "guest" | "authenticated";

interface AuthValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Untuk halaman yang wajib login: arahkan tamu ke /login?next=<halaman ini>. Kembalikan true kalau boleh lanjut. */
  requireLogin: (roles?: Role[]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Pulihkan sesi dari cookie refresh saat halaman pertama dibuka.
  useEffect(() => {
    let active = true;
    refreshSession().then((session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setStatus(session ? "authenticated" : "guest");
    });
    const off = onSessionChange((next) => {
      setUser(next);
      setStatus(next ? "authenticated" : "guest");
    });
    return () => {
      active = false;
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<SessionResult>("/auth/login", { method: "POST", body: { email, password } });
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus("authenticated");
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "fetch" } }).catch(
      () => undefined,
    );
    setAccessToken(null);
    setUser(null);
    setStatus("guest");
  }, []);

  const requireLogin = useCallback(
    (roles?: Role[]) => {
      if (status === "loading") return false;
      if (status === "guest") {
        const next = typeof window === "undefined" ? pathname : window.location.pathname + window.location.search;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return false;
      }
      return !roles || (user !== null && roles.includes(user.role));
    },
    [status, user, router, pathname],
  );

  const value = useMemo(() => ({ status, user, login, logout, requireLogin }), [status, user, login, logout, requireLogin]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return value;
}
