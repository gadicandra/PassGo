// Label status untuk halaman organizer. Satu kata berwarna, bukan badge (DESIGN.md).

import type { Event, SalesStatus } from "@/types/api";
import type { toneClass } from "@/lib/status";

type Tone = keyof typeof toneClass;

/** Status acara dari sisi organizer: draf / terbit / selesai / dibatalkan. */
export function eventStatusLabel(event: Pick<Event, "status" | "isEnded">): { label: string; tone: Tone } {
  if (event.status === "CANCELLED") return { label: "Dibatalkan", tone: "danger" };
  if (event.status === "DRAFT") return { label: "Draf", tone: "navy" };
  if (event.isEnded) return { label: "Selesai", tone: "muted" };
  return { label: "Terbit", tone: "teal" };
}

export const ticketSalesLabel: Record<SalesStatus, { label: string; tone: Tone }> = {
  ON_SALE: { label: "Dijual", tone: "teal" },
  UPCOMING: { label: "Belum dibuka", tone: "navy" },
  SOLD_OUT: { label: "Habis", tone: "navy" },
  PAUSED: { label: "Nonaktif", tone: "muted" },
  ENDED: { label: "Selesai", tone: "muted" },
};
