"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/lib/auth";

/** Halaman kelola acara khusus ORGANIZER: tamu ke /login?next=…, peran lain ke halaman awalnya (RequireAuth). */
export function OrganizerGate({ children }: { children: ReactNode }) {
  return <RequireAuth roles={["ORGANIZER"]}>{children}</RequireAuth>;
}
