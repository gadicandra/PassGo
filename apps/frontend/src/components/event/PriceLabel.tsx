import type { CSSProperties } from "react";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { eventPriceLine, toneClass } from "@/lib/status";

/** Takik setengah lingkaran di kiri-kanan, jadi badge berbentuk kupon tiket (selaras motif PassGo). */
function notch(radius: number): CSSProperties {
  const hole = `radial-gradient(circle at {side} 50%, transparent ${radius}px, #000 ${radius + 0.5}px)`;
  const mask = `${hole.replace("{side}", "0")} left / 51% 100% no-repeat, ${hole.replace("{side}", "100%")} right / 51% 100% no-repeat`;
  return { mask, WebkitMask: mask };
}

/** Badge "Gratis": satu bentuk di semua tempat supaya acara gratis cepat dikenali. */
export function FreeBadge({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  const lg = size === "lg";
  return (
    <span
      style={notch(lg ? 7 : 4)}
      className={cn(
        "inline-flex items-center font-display font-extrabold uppercase leading-none tracking-[0.08em]",
        lg ? "rounded-md bg-cream px-6 py-2.5 text-[20px] text-teal md:text-[22px]" : "rounded-[4px] bg-teal px-3.5 py-1 text-[12px] text-cream",
        className,
      )}
    >
      Gratis
    </span>
  );
}

/** Harga/status di bawah poster kartu acara. Acara gratis tampil sebagai badge, lainnya teks berwarna. */
export function PriceLabel({ event }: { event: Pick<EventSummary, "status" | "salesStatus" | "priceFrom"> }) {
  const price = eventPriceLine(event);
  if (price.label === "Gratis") return <FreeBadge className="mt-1 self-start" />;
  // "Mulai Rp75.000" → label kecil "Mulai dari" di atas angka tebal, angka jadi yang pertama terbaca.
  if (price.label.startsWith("Mulai ")) {
    return (
      <div>
        <p className="text-[13px] text-muted">Mulai dari</p>
        <p className="text-[16px] font-semibold tabular-nums text-navy">{price.label.slice(6)}</p>
      </div>
    );
  }
  return <p className={cn("text-[14px] font-bold", toneClass[price.tone])}>{price.label}</p>;
}
