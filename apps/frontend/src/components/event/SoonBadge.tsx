import { Clock } from "lucide-react";
import type { EventSummary } from "@/types/api";
import { daysUntilLabel } from "@/lib/format";

/** Pita "Hari ini" / "Besok" / "N hari lagi" di pojok poster untuk acara dekat yang masih bisa dibeli. */
export function SoonBadge({ event }: { event: Pick<EventSummary, "startAt" | "timezone" | "status" | "salesStatus"> }) {
  if (event.status !== "PUBLISHED" || event.salesStatus === "ENDED" || event.salesStatus === "SOLD_OUT") return null;
  const label = daysUntilLabel(event.startAt, event.timezone);
  if (!label) return null;
  return (
    <span className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold text-brand shadow-card">
      <Clock aria-hidden className="size-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
