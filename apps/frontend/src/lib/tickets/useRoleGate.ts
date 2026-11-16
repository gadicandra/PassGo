"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/types/api";
import { useAuth } from "@/lib/auth";

export type Gate = "checking" | "allowed" | "denied";

/** Tamu → /login?next=…; peran lain → "denied" supaya halaman bisa menampilkan AccessDenied. */
export function useRoleGate(roles: readonly Role[]): Gate {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);
  if (status !== "authenticated" || !user) return "checking";
  return roles.includes(user.role) ? "allowed" : "denied";
}
