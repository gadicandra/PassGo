"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/lib/auth";

/** Tamu diarahkan ke /login, peran selain ORGANIZER melihat pesan. Isi baru dirender setelah lolos. */
export function OrganizerGate({ children }: { children: ReactNode }) {
  return <RequireAuth roles={["ORGANIZER"]}>{children}</RequireAuth>;
}
