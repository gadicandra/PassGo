import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import { PriceLabel } from "./PriceLabel";
import { SoonBadge } from "./SoonBadge";
import { Poster } from "./Poster";

/** Kartu acara di katalog: poster, tanggal · jam, judul, tempat, garis putus, harga/status. Seluruh kartu adalah link. */
export function EventCard({ event, tone, className }: { event: EventSummary; tone?: number; className?: string }) {
  const cancelled = event.status === "CANCELLED";

  return (
    <Link href={`/events/${event.slug}`} className={cn("group flex flex-col transition-transform duration-200 hover:-translate-y-1", className)}>
      {/* Poster membesar sedikit di dalam bingkainya saat hover, bingkai tetap diam. */}
      <div className="relative overflow-hidden rounded-card shadow-card transition-shadow duration-200 group-hover:shadow-card-hover">
        <Poster event={event} tone={tone} className="transition-transform duration-300 ease-out group-hover:scale-[1.04]" />
        <SoonBadge event={event} />
      </div>
      <div className="mt-3 flex flex-col">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <CalendarDays aria-hidden className="size-3.5 shrink-0" />
          {formatDate(event.startAt, event.timezone).replace(/ \d{4}$/, "")} · {formatTime(event.startAt, event.timezone)}
        </p>
        <h3
          className={cn(
            "mt-1 line-clamp-2 text-[16px] font-semibold leading-snug md:text-[17px] transition-colors",
            cancelled ? "text-navy/40 line-through" : "text-navy group-hover:text-brand",
          )}
        >
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
