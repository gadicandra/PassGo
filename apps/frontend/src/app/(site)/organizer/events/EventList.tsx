"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Event } from "@/types/api";
import { cn } from "@/lib/cn";
import { dateParts, formatDateTime } from "@/lib/format";
import { toneClass } from "@/lib/status";
import { listOrganizerEvents, ticketTotals } from "@/lib/organizer/api";
import { errorMessage } from "@/lib/organizer/errors";
import { eventStatusLabel } from "@/lib/organizer/labels";

type Filter = "all" | "draft" | "published" | "ended" | "cancelled";

const filters: Array<{ value: Filter; label: string; match: (event: Event) => boolean }> = [
  { value: "all", label: "Semua", match: () => true },
  { value: "draft", label: "Draf", match: (event) => event.status === "DRAFT" },
  { value: "published", label: "Terbit", match: (event) => event.status === "PUBLISHED" && !event.isEnded },
  { value: "ended", label: "Selesai", match: (event) => event.status === "PUBLISHED" && event.isEnded },
  { value: "cancelled", label: "Dibatalkan", match: (event) => event.status === "CANCELLED" },
];

export function EventList() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // Pencarian juga dikirim ke server (`q`), supaya acara di luar 100 terbaru tetap bisa ditemukan.
  const search = query.trim().length >= 2 ? query.trim() : "";
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      listOrganizerEvents({ when: "all", q: search })
        .then((page) => {
          if (!active) return;
          setEvents(page.data);
          setTotal(page.meta.totalItems);
          setError(null);
        })
        .catch((caught) => active && setError(errorMessage(caught, "Gagal memuat acara.")));
    }, search ? 300 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const visible = useMemo(() => {
    if (!events) return [];
    const match = filters.find((item) => item.value === filter)!.match;
    const needle = query.trim().toLowerCase();
    return events.filter(
      (event) => match(event) && (!needle || event.title.toLowerCase().includes(needle) || event.venueName.toLowerCase().includes(needle)),
    );
  }, [events, filter, query]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Acara</h1>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label htmlFor="event-search" className="sr-only">
            Cari judul atau tempat
          </label>
          <input
            id="event-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul atau tempat"
            className="h-11 min-w-0 flex-1 rounded-md border border-navy/25 bg-white px-3 text-[15px] placeholder:text-muted focus:border-navy focus:outline-none sm:w-[260px] sm:flex-none"
          />
          <ButtonLink href="/organizer/events/new">Buat acara</ButtonLink>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2" role="tablist" aria-label="Filter status">
        {filters.map((item) => {
          const count = events?.filter(item.match).length;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "text-[15px] font-semibold underline-offset-8",
                filter === item.value ? "text-navy underline decoration-brand decoration-[3px]" : "text-muted hover:text-navy",
              )}
            >
              {item.label} {count !== undefined && <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {error ? (
          <p className="text-danger">{error}</p>
        ) : !events ? (
          <div className="flex flex-col gap-2" aria-busy aria-label="Memuat acara">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-start gap-2 py-10">
            <p className="text-[20px] font-semibold">Belum ada acara</p>
            <p className="text-muted">Acara baru disimpan sebagai draf dulu. Terbitkan setelah tipe tiketnya siap.</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-muted">Tidak ada acara yang cocok.</p>
        ) : (
          <ul className="border-t border-line">
            {visible.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
        {events && total > events.length && (
          <p className="mt-4 text-[14px] text-muted">
            Menampilkan {events.length} acara dengan jadwal terbaru dari {total}. Pakai pencarian untuk acara lama.
          </p>
        )}
      </div>
    </>
  );
}

/** Thumbnail 4:5 kecil. Poster lengkap terlalu ramai di ukuran 56px. */
function Thumb({ event }: { event: Event }) {
  const { day, month } = dateParts(event.startAt, event.timezone);
  if (event.posterUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- poster bisa dari Supabase atau /uploads backend
      <img src={event.posterUrl} alt="" loading="lazy" className="aspect-[4/5] w-14 rounded-md border border-line object-cover" />
    );
  }
  return (
    <div aria-hidden className="flex aspect-[4/5] w-14 flex-col items-center justify-center rounded-md border border-line bg-white leading-none">
      <span className="text-[18px] font-semibold">{day}</span>
      <span className="mt-1 text-[11px] text-muted">{month}</span>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const status = eventStatusLabel(event);
  const totals = ticketTotals(event);
  const cancelled = event.status === "CANCELLED";

  return (
    <li className="border-b border-line">
      <Link
        href={`/organizer/events/${event.id}`}
        className="group grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-4 md:grid-cols-[56px_minmax(0,1fr)_230px_100px_130px]"
      >
        <Thumb event={event} />
        <div className="min-w-0">
          <p className={cn("truncate text-[16px] font-semibold group-hover:text-brand", cancelled && "line-through decoration-navy/40")}>
            {event.title}
          </p>
          <p className="truncate text-[14px] text-muted">{event.venueName}</p>
          {/* Di layar sempit kolom tanggal/status/tiket digabung ke satu baris. */}
          <p className="mt-1 text-[14px] text-muted md:hidden">
            {formatDateTime(event.startAt, event.timezone)} ·{" "}
            <span className={cn("font-semibold", toneClass[status.tone])}>{status.label}</span>
            {totals.quota > 0 && ` · ${totals.sold}/${totals.quota} terjual`}
          </p>
        </div>
        <p className="hidden text-[14px] md:block">{formatDateTime(event.startAt, event.timezone)}</p>
        <p className={cn("hidden text-[14px] font-semibold md:block", toneClass[status.tone])}>{status.label}</p>
        <p className="hidden text-right text-[14px] tabular-nums text-muted md:block">
          {totals.quota ? (
            <>
              <span className="text-navy">{totals.sold}</span> / {totals.quota} terjual
            </>
          ) : (
            "Belum ada tiket"
          )}
        </p>
      </Link>
    </li>
  );
}
