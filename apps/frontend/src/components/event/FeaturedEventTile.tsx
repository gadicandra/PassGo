import Link from "next/link";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { dateParts, formatTime } from "@/lib/format";
import { eventPriceLine, toneClass } from "@/lib/status";
import { DateBlock, posterPalette, posterWords } from "./Poster";

// Tile landscape untuk acara terdekat: judul besar di 60% kiri, foto di 40% kanan dengan tepi tegas.
// Tingginya sama dengan poster 4:5 di kolom sebelahnya supaya baris tidak berlubang.
export function FeaturedEventTile({ event, tone, className }: { event: EventSummary; tone?: number; className?: string }) {
  const palette = posterPalette(event, tone);
  const price = eventPriceLine(event);
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
      <div className="mt-3 flex flex-col gap-0.5">
        <h3 className="font-display text-[20px] font-extrabold leading-snug tracking-tight text-navy group-hover:text-brand">
          {event.title}
        </h3>
        <p className="text-[13px] text-muted">
          {event.venueName} · {formatTime(event.startAt, event.timezone)} WIB
        </p>
        <p className={cn("text-[14px] font-bold", toneClass[price.tone])}>{price.label}</p>
      </div>
    </Link>
  );
}
