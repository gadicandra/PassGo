import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { PriceLabel } from "./PriceLabel";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { dateParts, formatDate, formatTime } from "@/lib/format";
import { DateBlock, posterPalette, posterWords } from "./Poster";

// Tile landscape untuk acara terdekat: judul besar di 60% kiri, foto di 40% kanan dengan tepi tegas.
// Tingginya sama dengan poster 4:5 di kolom sebelahnya supaya baris tidak berlubang.
export function FeaturedEventTile({ event, tone, className }: { event: EventSummary; tone?: number; className?: string }) {
  const palette = posterPalette(event, tone);
  const { day, month } = dateParts(event.startAt, event.timezone);

  return (
    <Link href={`/events/${event.slug}`} className={cn("group flex flex-col", className)}>
      <div
        className={cn(
          // Lebar 2x poster di sebelahnya, jadi rasio 8:5 membuat tingginya sama dengan poster 4:5.
          // Mulai sm tile selebar 2 kolom, jadi pakai landscape supaya tidak menjadi blok raksasa di tablet.
          "flex aspect-[4/5] overflow-hidden rounded-card border border-navy/15 shadow-card transition duration-200 group-hover:-translate-y-1 group-hover:shadow-card-hover sm:aspect-[2/1] lg:aspect-[8/5]",
          palette.bg,
        )}
      >
        <div className={cn("flex flex-1 flex-col justify-between p-6", palette.fg)}>
          <DateBlock day={day} month={month} />
          <p className="font-display text-[34px] font-extrabold uppercase leading-[0.92] tracking-[-0.03em] md:text-[40px]">
            {posterWords(event.title).map((word, index) => (
              <span key={index} className="block">
                {word}
              </span>
            ))}
          </p>
        </div>
        {event.posterUrl && (
          <div className="hidden w-[40%] border-l-2 border-navy sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- poster dari Supabase / uploads backend */}
            <img
              src={event.posterUrl}
              alt=""
              className="size-full object-cover contrast-125 grayscale transition duration-200 group-hover:grayscale-0"
            />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <CalendarDays aria-hidden className="size-3.5 shrink-0" />
          {formatDate(event.startAt, event.timezone).replace(/ \d{4}$/, "")} · {formatTime(event.startAt, event.timezone)}
        </p>
        <h3 className="mt-1 text-[19px] font-semibold leading-snug md:text-[20px] text-navy transition-colors group-hover:text-brand">
          {event.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-muted">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{event.venueName}</span>
        </p>
        <div className="mt-3 border-t border-dashed border-navy/20 pt-2.5">
          <PriceLabel event={event} />
        </div>
      </div>
    </Link>
  );
}
