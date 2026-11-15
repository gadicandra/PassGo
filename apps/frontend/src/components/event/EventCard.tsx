import Link from "next/link";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { eventPriceLine, toneClass } from "@/lib/status";
import { Poster } from "./Poster";

/** Kartu acara di katalog: poster + judul + "tempat · jam" + harga/status. Seluruh kartu adalah link. */
export function EventCard({ event, tone, className }: { event: EventSummary; tone?: number; className?: string }) {
  const cancelled = event.status === "CANCELLED";
  const price = eventPriceLine(event);

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "group flex flex-col transition-transform duration-200 hover:-translate-y-1 hover:-rotate-1",
        className,
      )}
    >
      <Poster event={event} tone={tone} className="shadow-card" />
      <div className="mt-3 flex flex-col gap-0.5">
        <h3
          className={cn(
            "line-clamp-2 font-display text-[16px] font-extrabold leading-snug tracking-tight transition-colors",
            cancelled ? "text-navy/40 line-through" : "text-navy group-hover:text-brand",
          )}
        >
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
