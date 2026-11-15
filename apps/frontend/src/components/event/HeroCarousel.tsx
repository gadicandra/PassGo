"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { EventSummary } from "@/types/api";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import { eventPriceLine } from "@/lib/status";
import { Poster, posterPalette } from "./Poster";

const AUTO_ADVANCE_MS = 6000;
const TEAR_MS = 650;
const STUB_POSTER = "rotate-[4deg] border-2 border-navy shadow-hard";

/** Tepi kertas sobek: gerigi 8px di sepanjang sisi, 26 gigi. `side` = sisi yang bergerigi. */
function tornEdge(side: "left" | "right") {
  const teeth = 26;
  const points: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const y = ((i / teeth) * 100).toFixed(2);
    const out = i % 2 === 0;
    points.push(side === "left" ? `${out ? 0 : 8}px ${y}%` : `calc(100% - ${out ? 0 : 8}px) ${y}%`);
  }
  return side === "left"
    ? `polygon(8px 0, 100% 0, 100% 100%, ${points.reverse().join(", ")})`
    : `polygon(0 0, ${points.join(", ")}, 0 100%)`;
}

const BODY_EDGE = tornEdge("right");
const STUB_EDGE = tornEdge("left");

/** Poster navy di atas hero navy akan hilang, jadi hero pakai oranye untuk acara berposter navy. */
function heroPalette(event: EventSummary) {
  const colors = posterPalette(event);
  return colors.bg === "bg-navy" ? { bg: "bg-brand", fg: "text-cream" } : colors;
}

// Hero katalog berbentuk tiket raksasa: takik + perforasi di 70%, poster miring di sobekan kanan.
export function HeroCarousel({ events }: { events: EventSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Sobekan tiket slide sebelumnya, dirender sebentar untuk animasi "dirobek".
  const [torn, setTorn] = useState<{ event: EventSummary; key: number } | null>(null);
  const count = events.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = useRef(0);

  const go = useCallback(
    (next: number) => {
      const target = ((next % count) + count) % count;
      if (target === current.current) return;
      setTorn({ event: events[current.current], key: Date.now() });
      current.current = target;
      setIndex(target);
    },
    [count, events],
  );

  useEffect(() => {
    if (!torn) return;
    const clear = setTimeout(() => setTorn(null), TEAR_MS);
    return () => clearTimeout(clear);
  }, [torn]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = setInterval(() => go(current.current + 1), AUTO_ADVANCE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, paused, index, go]);

  if (count === 0) return null;
  const event = events[index];
  const palette = heroPalette(event);
  const price = eventPriceLine(event);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Acara pilihan"
      className="mx-auto w-full max-w-[1200px] px-4 pt-8 md:px-8 md:pt-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative">
        <div key={event.id} className={cn("relative flex min-h-[300px] animate-[hero-in_300ms_var(--ease-ticket)] md:h-[440px]", palette.fg)}>
          {/* Badan tiket: tepi kanannya bergerigi (bekas sobekan) mulai md. */}
          <div
            style={{ "--tear": BODY_EDGE } as CSSProperties}
            className={cn(
              "flex w-full flex-col justify-between gap-8 rounded-2xl p-6 md:w-[70%] md:rounded-r-none md:p-12 md:pr-14 md:[clip-path:var(--tear)]",
              palette.bg,
            )}
          >
            {/* Urutan baca: judul → info → harga & tombol, jeda 80ms. */}
            <div>
              <h2 className="max-w-xl animate-[rise-in_500ms_var(--ease-ticket)_both] font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[64px]">
                {event.title}
              </h2>
              <p className="mt-5 animate-[rise-in_500ms_var(--ease-ticket)_80ms_both] font-mono text-[13px] font-medium uppercase tracking-wide">
                {formatDate(event.startAt, event.timezone)} · {formatTime(event.startAt, event.timezone)} WIB ·{" "}
                {event.venueName}
              </p>
            </div>
            <div className="flex animate-[rise-in_500ms_var(--ease-ticket)_160ms_both] flex-wrap items-center gap-5">
              <p className="text-[24px] font-semibold tabular-nums md:text-[28px]">{price.label}</p>
              <ButtonLink href={`/events/${event.slug}`} variant="dark">
                Beli tiket
              </ButtonLink>
            </div>
          </div>

          {/* Momen utama hero (skill animation-systems):
              0–500ms garis perforasi "digunting" → 500ms sobekan robek dari badan tiket dan tetap miring di sampingnya. */}
          <div
            style={{ "--tear": STUB_EDGE } as CSSProperties}
            className={cn(
              "relative -ml-[8px] hidden w-[calc(30%+8px)] origin-top-left animate-[stub-rip_650ms_var(--ease-ticket)_500ms_both] items-center justify-center rounded-r-2xl md:flex md:[clip-path:var(--tear)]",
              palette.bg,
            )}
          >
            <span
              aria-hidden
              className="absolute bottom-0 left-[8px] top-0 origin-top animate-[perf-cut_500ms_var(--ease-ticket)_both] border-l-2 border-dotted border-current opacity-40"
            />
            <div className="w-[240px]">
              <Poster event={event} size="lg" className={STUB_POSTER} />
            </div>
          </div>
        </div>

        {torn && (
          <div
            key={torn.key}
            aria-hidden
            style={{ "--tear": STUB_EDGE } as CSSProperties}
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-[calc(30%+8px)] origin-top-left animate-[stub-fall_650ms_var(--ease-tear)_forwards] items-center justify-center rounded-r-2xl md:flex md:[clip-path:var(--tear)]",
              heroPalette(torn.event).bg,
            )}
          >
            {/* Ganti slide: sobekan lama (lengkap dengan tepi bergerigi) jatuh berputar. */}
            <div className="w-[240px]">
              <Poster event={torn.event} size="lg" className={STUB_POSTER} />
            </div>
          </div>
        )}

        {count > 1 && (
          <>
            <ArrowButton side="left" onClick={() => go(index - 1)} />
            <ArrowButton side="right" onClick={() => go(index + 1)} />
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {events.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Tampilkan ${item.title}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className="py-2"
            >
              <span className={cn("block h-[3px] w-6 rounded-full transition-colors", i === index ? "bg-navy" : "bg-navy/25")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Acara sebelumnya" : "Acara berikutnya"}
      className={cn(
        "absolute top-1/2 z-30 hidden size-11 -translate-y-1/2 items-center justify-center rounded-md bg-navy text-cream transition-colors hover:bg-brand md:flex",
        side === "left" ? "-left-[22px]" : "-right-[22px]",
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points={side === "left" ? "10 3 5 8 10 13" : "6 3 11 8 6 13"} />
      </svg>
    </button>
  );
}
