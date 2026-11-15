"use client";

import { useEffect } from "react";
import type { Role } from "@/types/api";
import { useAuth } from "@/lib/api/auth";

export type Gate = "checking" | "allowed" | "denied";

export function useRoleGate(roles: readonly Role[]): Gate {
  const { status, user, requireLogin } = useAuth();
  useEffect(() => {
    requireLogin([...roles]);
  }, [requireLogin, roles]);
  if (status !== "authenticated" || !user) return "checking";
  return roles.includes(user.role) ? "allowed" : "denied";
}
