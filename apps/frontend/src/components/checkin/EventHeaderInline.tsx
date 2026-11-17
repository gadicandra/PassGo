import type { Event } from "@/types/api";
import { formatDateTime } from "@/lib/format";

export function EventHeaderInline({ event, error }: { event: Event | null; error: boolean }) {
  if (error) return <p className="mt-1 text-[#ff9b8a]" role="alert">Acara tidak ditemukan atau kamu tidak ditugaskan.</p>;
  if (!event) return <div className="mt-1 h-6 w-56 animate-pulse rounded bg-cream/15" aria-hidden />;
  return (
    <div className="mt-1">
      <h1 className="text-[22px] font-semibold leading-tight">{event.title}</h1>
      <p className="text-[14px] text-cream/70">{formatDateTime(event.startAt, event.timezone)}</p>
    </div>
  );
}
