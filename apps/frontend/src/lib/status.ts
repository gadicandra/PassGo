// Label status dalam Bahasa Indonesia + warna teks. Satu sumber supaya semua halaman konsisten.

import type { EventSummary, OrderStatus, RefundStatus, TicketStatus } from "@/types/api";
import { formatRupiah } from "./format";

type Tone = "brand" | "teal" | "muted" | "danger" | "navy";

export const toneClass: Record<Tone, string> = {
  brand: "text-brand",
  teal: "text-teal",
  muted: "text-muted",
  danger: "text-danger",
  navy: "text-navy",
};

/** Baris harga/status di bawah poster acara. */
export function eventPriceLine(event: Pick<EventSummary, "status" | "salesStatus" | "priceFrom">): {
  label: string;
  tone: Tone;
} {
  if (event.status === "CANCELLED") return { label: "Dibatalkan", tone: "danger" };
  switch (event.salesStatus) {
    case "UPCOMING":
      return { label: "Segera dibuka", tone: "muted" };
    case "SOLD_OUT":
      return { label: "Habis", tone: "navy" };
    case "ENDED":
    case "PAUSED":
      return { label: "Selesai", tone: "muted" };
    default:
      if (event.priceFrom === null) return { label: "Segera dibuka", tone: "muted" };
      if (event.priceFrom === 0) return { label: "Gratis", tone: "teal" };
      return { label: `Mulai ${formatRupiah(event.priceFrom)}`, tone: "brand" };
  }
}

export const orderStatusLabel: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "Menunggu pembayaran", tone: "brand" },
  PAID: { label: "Lunas", tone: "teal" },
  EXPIRED: { label: "Kedaluwarsa", tone: "muted" },
  CANCELLED: { label: "Dibatalkan", tone: "muted" },
};

export const refundStatusLabel: Record<RefundStatus, { label: string; tone: Tone } | null> = {
  NOT_REQUIRED: null,
  REQUIRED: { label: "Perlu refund", tone: "danger" },
  REFUNDED: { label: "Sudah di-refund", tone: "muted" },
};

export const ticketStatusLabel: Record<TicketStatus, { label: string; tone: Tone }> = {
  VALID: { label: "Berlaku", tone: "navy" },
  CHECKED_IN: { label: "Sudah masuk", tone: "teal" },
  VOID: { label: "Tidak berlaku", tone: "danger" },
};
