import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const iconTone = {
  brand: "bg-brand/10 text-brand",
  teal: "bg-teal/10 text-teal",
  sun: "bg-sun/20 text-[#b7740a]",
  navy: "bg-navy/[0.07] text-navy",
};

/** Judul section katalog: ikon + judul di kiri, jumlah acara dan tautan "Lihat semua ›" di kanan. */
export function SectionHeading({
  title,
  icon: Icon,
  count,
  href,
  tone = "brand",
  onColor = false,
  className,
}: {
  title: string;
  /** Ikon garis kecil di depan judul, membantu memindai section. */
  icon?: LucideIcon;
  count?: number;
  href?: string;
  /** Warna kotak ikon; tiap section beda warna supaya ikon tidak seragam oranye. */
  tone?: keyof typeof iconTone;
  /** Di atas latar berwarna (band kuning): tautan navy supaya kontras cukup. */
  onColor?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2", className)}>
      <h2 className="flex items-center gap-2.5 text-[24px] font-bold leading-tight tracking-[-0.01em] md:text-[28px]">
        {Icon && (
          <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl md:size-10", onColor ? "bg-white/60 text-navy" : iconTone[tone])}>
            <Icon className="size-5 md:size-[22px]" strokeWidth={2.25} />
          </span>
        )}
        {title}
      </h2>
      <div className="flex items-center gap-4">
        {count !== undefined && <span className={cn("text-[14px] font-medium tabular-nums", onColor ? "text-navy/70" : "text-muted")}>{count} acara</span>}
        {href && (
          <Link href={href} className={cn("inline-flex items-center gap-0.5 text-[15px] font-semibold", onColor ? "text-navy hover:underline" : "text-brand hover:text-brand-dark")}>
            Lihat semua
            <ChevronRight aria-hidden className="size-4" strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </div>
  );
}
