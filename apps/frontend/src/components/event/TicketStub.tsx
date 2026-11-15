import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Kartu sobekan tiket landscape: thumbnail di kiri | perforasi bertakik | isi di kanan.
 * Dipakai di band "Gratis", tiket saya, ringkasan pesanan, acara saya (staff).
 *
 * <TicketStub thumb={<Poster event={e} size="sm" />} notchBg="var(--color-sun)">
 *   <h3>…</h3>
 * </TicketStub>
 */
export function TicketStub({
  thumb,
  children,
  notchBg = "var(--color-cream)",
  thumbWidth = 130,
  className,
}: {
  thumb: ReactNode;
  children: ReactNode;
  /** Warna latar di belakang kartu, supaya takiknya terlihat "berlubang". */
  notchBg?: string;
  thumbWidth?: number;
  className?: string;
}) {
  return (
    <div
      style={
        {
          "--notch-bg": notchBg,
          "--notch-x": `${thumbWidth}px`,
          "--notch-size": "10px",
        } as CSSProperties
      }
      className={cn(
        "ticket-notch flex overflow-hidden rounded-card border-2 border-navy bg-white shadow-card",
        className,
      )}
    >
      <div className="shrink-0 [&>*]:rounded-none [&>*]:border-0" style={{ width: thumbWidth }}>
        {thumb}
      </div>
      <div className="w-0 border-r-2 border-dotted border-navy/30" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4">{children}</div>
    </div>
  );
}

/**
 * Garis perforasi horizontal dengan takik di kiri-kanan, untuk tiket vertikal (QR, ringkasan checkout).
 * Beri className margin negatif setara padding kartu supaya takik menempel di tepi, mis. "-mx-5" untuk kartu p-5.
 */
export function Perforation({ notchBg = "var(--color-cream)", className }: { notchBg?: string; className?: string }) {
  return (
    <div className={cn("relative my-3 h-0 border-t-2 border-dotted border-navy/25", className)} aria-hidden>
      <span className="absolute -left-[11px] -top-[11px] size-5 rounded-full" style={{ background: notchBg }} />
      <span className="absolute -right-[11px] -top-[11px] size-5 rounded-full" style={{ background: notchBg }} />
    </div>
  );
}
