"use client";

import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/api/auth";

/** Tamu diarahkan ke /login, peran selain ORGANIZER melihat pesan. Isi baru dirender setelah lolos. */
export function OrganizerGate({ children }: { children: ReactNode }) {
  const { requireLogin, status, user } = useAuth();

  // requireLogin sekaligus mengarahkan tamu ke /login?next=…
  useEffect(() => {
    requireLogin(["ORGANIZER"]);
  }, [requireLogin]);

  if (status === "authenticated" && user?.role === "ORGANIZER") return <>{children}</>;
  if (status === "authenticated") return <p className="text-muted">Halaman ini khusus organizer.</p>;

  return (
    <div className="flex flex-col gap-3" aria-busy aria-label="Memuat">
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-1/3 max-w-xs" />
      <Skeleton className="mt-6 h-40 w-full" />
    </div>
  );
}
