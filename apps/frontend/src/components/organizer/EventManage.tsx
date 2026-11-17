"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Event } from "@/types/api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { toneClass } from "@/lib/status";
import { getEvent } from "@/lib/organizer/api";
import { errorMessage } from "@/lib/organizer/errors";
import { eventStatusLabel } from "@/lib/organizer/labels";
import { EventActions, PublishChecklist } from "./EventActions";

interface ManagedEvent {
  event: Event;
  /** Ganti acara di memori dengan respons terbaru dari API (menyimpan `version` baru untuk If-Match). */
  setEvent: (event: Event) => void;
  /** Ambil ulang dari server, mis. setelah tipe tiket berubah (priceFrom, salesStatus ikut berubah). */
  reload: () => Promise<void>;
}

const EventContext = createContext<ManagedEvent | null>(null);

export function useManagedEvent(): ManagedEvent {
  const value = useContext(EventContext);
  if (!value) throw new Error("useManagedEvent harus dipakai di dalam <EventManageShell>");
  return value;
}

export function EventManageShell({ eventId, children }: { eventId: string; children: ReactNode }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [failure, setFailure] = useState<{ notFound: boolean; message: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      setEvent(await getEvent(eventId));
      setFailure(null);
    } catch (error) {
      setFailure({
        notFound: error instanceof ApiError && error.status === 404,
        message: errorMessage(error, "Gagal memuat acara."),
      });
    }
  }, [eventId]);

  useEffect(() => {
    let active = true;
    getEvent(eventId)
      .then((loaded) => active && setEvent(loaded))
      .catch((error) => {
        if (!active) return;
        setFailure({
          notFound: error instanceof ApiError && error.status === 404,
          message: errorMessage(error, "Gagal memuat acara."),
        });
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const value = useMemo(() => (event ? { event, setEvent, reload } : null), [event, reload]);

  if (failure && !event) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em]">
          {failure.notFound ? "Acara tidak ditemukan" : "Gagal memuat acara"}
        </h1>
        <p className="text-muted">{failure.notFound ? "Mungkin draf ini sudah dihapus." : failure.message}</p>
        <Link href="/organizer/events" className="font-semibold underline underline-offset-4 hover:text-brand">
          Kembali ke daftar acara
        </Link>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="flex flex-col gap-3" aria-busy aria-label="Memuat acara">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-2/3 max-w-xl" />
        <Skeleton className="h-5 w-1/3 max-w-sm" />
        <Skeleton className="mt-8 h-10 w-full max-w-lg" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  return (
    <EventContext.Provider value={value}>
      <EventHeader />
      <EventTabs />
      {failure && (
        <p role="alert" className="mt-6 rounded-md bg-danger/10 px-4 py-3 text-[15px] text-danger">
          Data acara belum diperbarui: {failure.message}{" "}
          <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-4">
            Muat ulang
          </button>
        </p>
      )}
      <div className="mt-8">{children}</div>
    </EventContext.Provider>
  );
}

function EventHeader() {
  const { event } = useManagedEvent();
  const status = eventStatusLabel(event);

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <Link href="/organizer/events" className="text-[14px] font-semibold text-muted underline-offset-4 hover:text-navy hover:underline">
            Semua acara
          </Link>
          <h1 className="mt-2 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] break-words md:text-[48px]">
            {event.title}
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            <span className={cn("font-semibold", toneClass[status.tone])}>{status.label}</span>
            {" · "}
            {formatDateTime(event.startAt, event.timezone)} · {event.venueName}
            {event.status !== "DRAFT" && (
              <>
                {" · "}
                <Link href={`/events/${event.slug}`} className="font-semibold text-navy underline underline-offset-4 hover:text-brand">
                  Lihat halaman publik
                </Link>
              </>
            )}
          </p>
          {event.status === "CANCELLED" && event.cancelReason && (
            <p className="mt-2 text-[15px]">
              <span className="font-semibold text-danger">Alasan pembatalan:</span> {event.cancelReason}
            </p>
          )}
        </div>
        <EventActions />
      </div>
      {event.status === "DRAFT" && <PublishChecklist />}
    </header>
  );
}

function EventTabs() {
  const { event } = useManagedEvent();
  const pathname = usePathname();
  const base = `/organizer/events/${event.id}`;
  const tabs = [
    { href: base, label: "Detail", exact: true },
    { href: `${base}/tickets`, label: "Tipe tiket" },
    { href: `${base}/staff`, label: "Panitia" },
    { href: `${base}/sales`, label: "Penjualan" },
    // Halaman peserta & kehadiran milik modul tiket (Rasyid).
    ...(event.status === "DRAFT"
      ? []
      : [
          { href: `${base}/attendees`, label: "Peserta" },
          { href: `${base}/attendance`, label: "Kehadiran" },
        ]),
  ];

  return (
    <nav aria-label="Kelola acara" className="mt-8 border-b border-line">
      <div className="-mb-px flex gap-7 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-[3px] pb-3 text-[15px] font-semibold transition-colors",
                active ? "border-brand text-navy" : "border-transparent text-muted hover:text-navy",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
