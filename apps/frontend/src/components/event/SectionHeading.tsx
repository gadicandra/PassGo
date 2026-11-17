import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Judul section katalog: ikon + judul di kiri, jumlah acara dan tautan "Lihat semua ›" di kanan. */
export function SectionHeading({
  title,
  icon: Icon,
  count,
  href,
  className,
}: {
  title: string;
  /** Ikon garis kecil di depan judul, membantu memindai section. */
  icon?: LucideIcon;
  count?: number;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line pb-3", className)}>
      <h2 className="flex items-center gap-2.5 text-[24px] font-bold leading-tight tracking-[-0.01em] md:text-[28px]">
        {Icon && <Icon aria-hidden className="size-6 shrink-0 text-brand md:size-7" strokeWidth={2} />}
        {title}
      </h2>
      <div className="flex items-center gap-4">
        {count !== undefined && <span className="text-[14px] font-medium tabular-nums text-muted">{count} acara</span>}
        {href && (
          <Link href={href} className="inline-flex items-center gap-0.5 text-[15px] font-semibold text-navy hover:text-brand">
            Lihat semua
            <ChevronRight aria-hidden className="size-4" strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </div>
  );
}
