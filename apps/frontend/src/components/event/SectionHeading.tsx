import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Judul section katalog: ikon + judul di kiri, jumlah acara dan tautan "Lihat semua ›" di kanan. */
export function SectionHeading({
  title,
  icon: Icon,
  count,
  href,
  onColor = false,
  className,
}: {
  title: string;
  /** Ikon garis kecil di depan judul, membantu memindai section. */
  icon?: LucideIcon;
  count?: number;
  href?: string;
  /** Di atas latar berwarna (band kuning): tautan navy supaya kontras cukup. */
  onColor?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2", className)}>
      <h2 className="flex items-center gap-2.5 text-[24px] font-bold leading-tight tracking-[-0.01em] md:text-[28px]">
        {Icon && <Icon aria-hidden className={cn("size-6 shrink-0 md:size-7", onColor ? "text-navy" : "text-brand")} strokeWidth={2} />}
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
