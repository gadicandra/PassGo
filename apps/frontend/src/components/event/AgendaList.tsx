import Link from "next/link";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { dateParts, formatTime } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";
import { Poster } from "./Poster";
import { PriceLabel } from "./PriceLabel";

/**
 * Agenda berbentuk linimasa: blok tanggal (bulan / tanggal / hari) di kiri disambung garis putus,
 * baris acara di kanan dengan poster kecil. Mudah dipindai berdasarkan waktu.
 */
export function AgendaList({ events }: { events: EventSummary[] }) {
  return (
    <ol className="relative">
      {events.map((event, index) => {
        const { day, month, weekday } = dateParts(event.startAt, event.timezone);
        const cancelled = event.status === "CANCELLED";
        const last = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-4 md:gap-6">
            {/* Garis linimasa: dari bawah blok tanggal ini ke blok berikutnya. */}
            {!last && <span aria-hidden className="absolute left-[27px] top-[84px] bottom-0 border-l-2 border-dashed border-navy/15 md:left-[31px]" />}
            <div
              className={cn(
                "relative z-10 mt-4 flex h-[76px] w-14 shrink-0 flex-col items-center justify-center rounded-lg border bg-white text-center md:w-16",
                cancelled ? "border-navy/10 text-navy/40" : "border-navy/15 text-navy",
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{month}</span>
              <span className="font-display text-[24px] font-extrabold leading-none">{day}</span>
              <span className="text-[11px] font-semibold text-muted">{weekday}</span>
            </div>

            <Reveal index={index % 3} className="min-w-0 flex-1">
              <Link
                href={`/events/${event.slug}`}
                className={cn("group flex items-center gap-4 py-4", !last && "border-b border-line")}
              >
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      "font-display text-[17px] font-extrabold leading-snug tracking-tight transition-colors md:text-[19px]",
                      cancelled ? "text-navy/40 line-through" : "text-navy group-hover:text-brand",
                    )}
                  >
                    {event.title}
                  </h3>
                  <p className="mt-1 truncate text-[13px] text-muted">
                    {formatTime(event.startAt, event.timezone)} WIB · {event.venueName}
                  </p>
                  <div className="mt-2">
                    <PriceLabel event={event} />
                  </div>
                </div>
                <div className="w-[72px] shrink-0 overflow-hidden rounded-lg md:w-[96px]">
                  <Poster event={event} size="sm" tone={index} className="transition-transform duration-300 group-hover:scale-[1.05]" />
                </div>
              </Link>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
