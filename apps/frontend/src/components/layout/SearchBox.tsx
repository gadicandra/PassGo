"use client";

import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EventSummary } from "@/types/api";
import { Poster } from "@/components/event/Poster";
import { categories } from "@/lib/categories";
import { formatDate } from "@/lib/format";

// Contoh kata kunci yang bergantian di placeholder, memberi ide apa yang bisa dicari.
const IDEAS = ["konser", "workshop", "pameran", "pemutaran film", "acara gratis"];
const CYCLE_MS = 2600;

function fetchUpcoming(): Promise<EventSummary[]> {
  return fetch("/api/v1/events?when=upcoming&pageSize=3&sort=startAt")
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { data?: EventSummary[] } | null) => body?.data ?? [])
    .catch(() => []);
}

/**
 * Kolom cari di header. Placeholder bergantian (berhenti saat fokus/terisi atau reduced motion).
 * Saat fokus dan kosong: panel "Banyak dicari" (kategori) dan tiga acara terdekat.
 * `page`: versi halaman /cari di HP (lebar penuh, panel selalu tampil). Tanpa itu: di header, mulai layar md.
 */
export function SearchBox({ page = false }: { page?: boolean }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const [upcoming, setUpcoming] = useState<EventSummary[] | null>(null);
  const loaded = useRef(false);
  const idle = !value && !focused;

  // Acara terdekat diambil sekali: saat kolom pertama kali difokuskan, atau langsung di halaman /cari.
  const loadUpcoming = useCallback(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetchUpcoming().then(setUpcoming);
  }, []);

  useEffect(() => {
    if (page) loadUpcoming();
  }, [page, loadUpcoming]);

  useEffect(() => {
    if (!idle || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % IDEAS.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [idle]);

  function onFocus() {
    setFocused(true);
    loadUpcoming();
  }

  return (
    <form
      action="/"
      role="search"
      className={page ? "relative w-full" : "relative hidden max-w-xl flex-1 md:block"}
      onKeyDown={(event) => event.key === "Escape" && (event.target as HTMLElement).blur()}
    >
      <label htmlFor="site-search" className="sr-only">
        Cari acara
      </label>
      {/* Kotak input sendiri, supaya tombol cari menempel di input, bukan di seluruh form + panel. */}
      <div className="relative">
        <input
          id="site-search"
          name="q"
          type="search"
          value={value}
          autoComplete="off"
          autoFocus={page}
          onChange={(event) => setValue(event.target.value)}
          onFocus={onFocus}
          onBlur={() => setFocused(false)}
          placeholder={focused ? "Judul acara atau tempat" : ""}
          className="h-11 w-full rounded-lg border border-[#2b3c63] bg-[#1b2b4d] pl-4 pr-12 text-[15px] text-cream placeholder:text-cream/50 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Cari"
          className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-md bg-brand text-white transition-colors hover:bg-brand-dark"
        >
          <Search aria-hidden className="size-[18px]" strokeWidth={2.5} />
        </button>
        {idle && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center gap-1.5 overflow-hidden text-[15px] text-cream/50">
            Cari acara
            <b key={index} className="animate-[rise-in_400ms_var(--ease-ticket)] font-semibold text-cream/85">
              {IDEAS[index]}
            </b>
          </span>
        )}
      </div>

      {(page || focused) && !value && (
        // onMouseDown preventDefault: klik di panel tidak membuat input blur sebelum tautan terbuka.
        <div
          onMouseDown={(event) => event.preventDefault()}
          className={page ? "mt-4 rounded-xl bg-white p-4 text-navy shadow-card" : "absolute inset-x-0 top-[calc(100%+8px)] z-50 animate-[rise-in_200ms_var(--ease-ticket)] rounded-xl bg-white p-4 text-navy shadow-[0_12px_32px_rgb(20_33_61/0.22)]"}
        >
          <p className="text-[13px] font-semibold text-muted">Banyak dicari</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/?kategori=${category.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-brand/10 hover:text-brand"
                >
                  <TrendingUp aria-hidden className="size-3.5 text-brand" strokeWidth={2.5} />
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-lg border border-line p-3">
            <p className="text-[13px] font-semibold text-muted">Acara terdekat</p>
            {upcoming === null ? (
              <p className="mt-2 text-[13px] text-muted">Memuat…</p>
            ) : upcoming.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">Belum ada acara.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {upcoming.map((event, i) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.slug}`} className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-navy/5">
                      <span className="w-10 shrink-0">
                        <Poster event={event} size="sm" tone={i} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">{event.title}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {formatDate(event.startAt, event.timezone).replace(/ \d{4}$/, "")} · {event.venueName}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
