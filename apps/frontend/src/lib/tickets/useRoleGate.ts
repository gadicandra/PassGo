"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/types/api";
import { homeFor, useAuth } from "@/lib/auth";

export type Gate = "checking" | "allowed" | "denied";

/**
 * Tamu → /login?next=…; peran lain → dialihkan ke beranda perannya (sama dengan RequireAuth).
 * "denied" tetap dikembalikan selama pengalihan berjalan, supaya halaman tidak sempat memuat data.
 */
export function useRoleGate(roles: readonly Role[]): Gate {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = status === "authenticated" && !!user && roles.includes(user.role);
  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && user && !allowed) router.replace(homeFor(user.role));
  }, [status, user, allowed, router, pathname]);
  if (status !== "authenticated" || !user) return "checking";
  return allowed ? "allowed" : "denied";
}
