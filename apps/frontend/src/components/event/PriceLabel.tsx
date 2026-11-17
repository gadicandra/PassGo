import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { eventPriceLine, toneClass } from "@/lib/status";

/** Badge "Gratis": satu bentuk di semua tempat supaya acara gratis cepat dikenali (konsisten, kontras cukup). */
export function FreeBadge({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-teal font-bold text-cream",
        size === "lg" ? "px-4 py-1.5 text-[20px] md:text-[22px]" : "px-2.5 py-0.5 text-[13px]",
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
  return <p className={cn("text-[14px] font-bold", toneClass[price.tone])}>{price.label}</p>;
}
