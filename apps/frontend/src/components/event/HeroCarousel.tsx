"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { EventSummary } from "@/types/api";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Clock } from "lucide-react";
import { daysUntilLabel, formatDate, formatTime } from "@/lib/format";
import { eventPriceLine } from "@/lib/status";
import { Poster, posterPalette } from "./Poster";
import { FreeBadge } from "./PriceLabel";
import { HOLE_GAP, TEAR_DEPTH, tornEdge } from "./tornEdge";

const AUTO_ADVANCE_MS = 7000;
const FALL_MS = 700;
const STUB_POSTER = "rotate-[4deg] shadow-card-hover";

/** Poster navy di atas hero navy akan hilang, jadi hero pakai oranye untuk acara berposter navy. */
function heroPalette(event: EventSummary) {
  const colors = posterPalette(event);
  return colors.bg === "bg-navy" ? { bg: "bg-brand", fg: "text-cream" } : colors;
}

/*
  Hero katalog = tiket raksasa yang dirobek. Koreografi (skill animation-systems, satu momen utama):
    0 ms      badan + sobekan muncul sebagai satu tiket utuh, judul → info → harga naik bergantian
    150 ms    lubang perforasi "dipon" dari atas ke bawah
    700 ms    seperti solasi ditarik: tegang sebentar, lalu robekan merambat pelan dan rata dari atas ke bawah
              (poros di sudut bawah) selama ±1,5 detik; serat putih kertas terbuka mengikuti titik robek;
              bagian bawah lepas lembut dan sobekan diam miring, tanpa pantulan
    ganti     sobekan lama jatuh berputar keluar, tiket berikutnya mengulang dari awal
  Tepi sobek memakai noise lebar + halus per acara (skill paper-cinder-transition).
  Autoplay berhenti saat hero di luar layar atau tab tersembunyi (skill optimize-web-animations).
*/
export function HeroCarousel({ events }: { events: EventSummary[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  // Sobekan slide sebelumnya, dirender sebentar untuk animasi jatuh.
  const [torn, setTorn] = useState<{ event: EventSummary; key: number } | null>(null);
  const section = useRef<HTMLElement>(null);
  const current = useRef(0);
  const count = events.length;

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
    const clear = setTimeout(() => setTorn(null), FALL_MS);
    return () => clearTimeout(clear);
  }, [torn]);

  // Hanya jalan saat terlihat: di luar layar atau tab tersembunyi, autoplay berhenti.
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden), {
      threshold: 0.3,
    });
    const onVisibility = () => setVisible(!document.hidden && element.getBoundingClientRect().bottom > 0);
    observer.observe(element);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (count < 2 || hovered || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => go(current.current + 1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [count, hovered, visible, index, go]);

  const event = events[index] ?? events[0];
  const edge = useMemo(() => (event ? tornEdge(event.id) : null), [event]);
  const tornEdgeShape = useMemo(() => (torn ? tornEdge(torn.event.id) : null), [torn]);

  if (!event || !edge) return null;
  const palette = heroPalette(event);
  const price = eventPriceLine(event);
  const soon = event.status === "PUBLISHED" ? daysUntilLabel(event.startAt, event.timezone) : null;

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      aria-label="Acara pilihan"
      className="mx-auto w-full max-w-[1200px] px-4 pt-8 md:px-8 md:pt-12"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="relative">
        <div key={event.id} className={cn("relative flex min-h-[300px] animate-[hero-in_300ms_var(--ease-ticket)] md:h-[440px]", palette.fg)}>
          {/* Badan tiket. Mulai md tepi kanannya mengikuti garis sobek. */}
          <div
            style={{ "--edge": edge.body, "--fiber": edge.bodyFiber } as CSSProperties}
            className={cn(
              "relative flex w-full flex-col justify-between gap-8 rounded-2xl p-6 md:w-[70%] md:rounded-r-none md:p-12 md:pr-14 md:[clip-path:var(--edge)]",
              palette.bg,
            )}
          >
            <span aria-hidden className="tear-reveal absolute inset-0 hidden bg-cream [clip-path:var(--fiber)] md:block" />
            <div className="relative">
              {soon && (
                <span className="mb-4 inline-flex animate-[rise-in_400ms_var(--ease-ticket)_both] items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[13px] font-bold text-brand">
                  <Clock aria-hidden className="size-3.5" strokeWidth={2.5} />
                  {soon}
                </span>
              )}
              <h2 className="max-w-xl animate-[rise-in_500ms_var(--ease-ticket)_both] font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[64px]">
                {event.title}
              </h2>
              <p className="mt-5 animate-[rise-in_500ms_var(--ease-ticket)_80ms_both] text-[17px] font-medium md:text-[18px]">
                {formatDate(event.startAt, event.timezone)} · {formatTime(event.startAt, event.timezone)} WIB ·{" "}
                {event.venueName}
              </p>
            </div>
            <div className="relative flex animate-[rise-in_500ms_var(--ease-ticket)_160ms_both] flex-wrap items-center gap-5">
              {price.label === "Gratis" ? <FreeBadge size="lg" /> : <p className="text-[24px] font-semibold tabular-nums md:text-[28px]">{price.label}</p>}
              <ButtonLink href={`/events/${event.slug}`} variant="dark">
                Beli tiket
              </ButtonLink>
            </div>
          </div>

          {/* Sobekan: pembungkus ini yang bergerak (poros sudut kiri bawah); isinya dipotong mengikuti garis sobek. */}
          <div
            style={{ width: `calc(30% + ${TEAR_DEPTH}px)`, marginLeft: -TEAR_DEPTH }}
            className="relative hidden origin-bottom-left animate-[stub-rip_2200ms_linear_700ms_both] md:block"
          >
            <span aria-hidden className="absolute inset-y-6 left-8 right-0 rounded-2xl bg-navy/40 opacity-0 blur-xl animate-[lift-shadow_2200ms_linear_700ms_both]" />
            <StubPiece event={event} edge={edge} className={palette.bg} />
          </div>
        </div>

        {torn && tornEdgeShape && (
          <div
            key={torn.key}
            aria-hidden
            style={{ width: `calc(30% + ${TEAR_DEPTH}px)` }}
            className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden origin-bottom-left animate-[stub-fall_700ms_var(--ease-tear)_forwards] md:block"
          >
            <StubPiece event={torn.event} edge={tornEdgeShape} className={heroPalette(torn.event).bg} settled />
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
              className="py-[11px]"
            >
              <span className={cn("block h-[3px] w-6 rounded-full transition-colors", i === index ? "bg-navy" : "bg-navy/25")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Potongan sobekan: warna tiket dipotong garis sobek, perforasi di tepinya, serat putih, dan poster. */
function StubPiece({
  event,
  edge,
  className,
  settled = false,
}: {
  event: EventSummary;
  edge: ReturnType<typeof tornEdge>;
  className: string;
  /** true untuk sobekan yang sudah robek (jatuh saat ganti slide): serat langsung terlihat, tanpa animasi masuk. */
  settled?: boolean;
}) {
  return (
    <div
      style={{ "--edge": edge.stub, "--fiber": edge.stubFiber } as CSSProperties}
      className={cn("relative flex h-full items-center justify-center rounded-r-2xl [clip-path:var(--edge)]", className)}
    >
      {/* Lubang perforasi di sepanjang garis sobek, berjarak sama dengan lekuk tepi (HOLE_GAP) supaya sejajar. */}
      <span
        aria-hidden
        style={{
          left: TEAR_DEPTH - 8,
          backgroundImage: "radial-gradient(circle, currentColor 1.6px, transparent 2.2px)",
          backgroundSize: `5px ${HOLE_GAP}px`,
          backgroundPosition: `0 ${-HOLE_GAP / 2}px`,
        }}
        className={cn(
          "absolute inset-y-0 w-[5px] origin-top opacity-30",
          !settled && "animate-[perf-cut_450ms_var(--ease-ticket)_150ms_both]",
        )}
      />
      <span
        aria-hidden
        className={cn("absolute inset-0 bg-cream [clip-path:var(--fiber)]", !settled && "tear-reveal")}
      />
      <div className="relative w-[240px]">
        <Poster event={event} size="lg" className={STUB_POSTER} />
      </div>
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Acara sebelumnya" : "Acara berikutnya"}
      className={cn(
        "absolute top-1/2 z-30 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-navy shadow-card text-cream transition-colors hover:bg-brand md:flex",
        side === "left" ? "-left-[22px]" : "-right-[22px]",
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points={side === "left" ? "10 3 5 8 10 13" : "6 3 11 8 6 13"} />
      </svg>
    </button>
  );
}
