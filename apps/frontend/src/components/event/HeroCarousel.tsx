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
const STUB_POSTER = "w-[260px] -translate-y-6 rotate-[4deg] border-2 border-navy shadow-hard";

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
  const posterColors = posterPalette(event);
  // Poster navy di atas hero navy akan hilang, jadi hero pakai oranye untuk acara berposter navy.
  const palette = posterColors.bg === "bg-navy" ? { bg: "bg-brand", fg: "text-cream" } : posterColors;
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
        <div
          key={event.id}
          style={{ "--notch-x": "70%", "--notch-size": "16px" } as CSSProperties}
          className={cn(
            "md:ticket-notch relative flex min-h-[360px] animate-[hero-in_300ms_ease-out] rounded-2xl md:h-[440px]",
            palette.bg,
            palette.fg,
          )}
        >
          <div className="flex w-full flex-col justify-between gap-8 p-6 md:w-[70%] md:p-12 md:pr-14">
            <div>
              <h2 className="max-w-xl font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[64px]">
                {event.title}
              </h2>
              <p className="mt-5 font-mono text-[13px] font-medium uppercase tracking-wide">
                {formatDate(event.startAt, event.timezone)} · {formatTime(event.startAt, event.timezone)} WIB ·{" "}
                {event.venueName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <p className="text-[24px] font-semibold tabular-nums md:text-[28px]">{price.label}</p>
              <ButtonLink href={`/events/${event.slug}`} variant="dark">
                Beli tiket
              </ButtonLink>
            </div>
          </div>

          <div
            aria-hidden
            className="absolute bottom-0 left-[70%] top-0 hidden animate-[perf-rip_650ms_ease-out] border-r-2 border-dotted border-current opacity-40 md:block"
          />
          <div className="hidden w-[30%] items-center justify-center md:flex">
            {/* Sobekan baru turun ke tempatnya; di render pertama juga diputar sekali. */}
            <div className="animate-[stub-in_550ms_cubic-bezier(.2,.9,.3,1.2)_120ms_both]">
              <Poster event={event} size="lg" className={STUB_POSTER} />
            </div>
          </div>
        </div>

        {torn && (
          <div
            key={torn.key}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-[30%] items-center justify-center md:flex"
          >
            {/* Sobekan lama dirobek dari garis perforasi lalu jatuh berputar. */}
            <div className="origin-top-left animate-[stub-tear_650ms_cubic-bezier(.5,0,.75,0)_forwards]">
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
