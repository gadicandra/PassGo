import Link from "next/link";
import { cn } from "@/lib/cn";

/** Judul section katalog: judul besar di kiri, jumlah acara (mono) dan tautan opsional di kanan. */
export function SectionHeading({
  title,
  count,
  href,
  className,
}: {
  title: string;
  count?: number;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-2", className)}>
      <h2 className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] md:text-[44px]">{title}</h2>
      <div className="flex items-baseline gap-4">
        {count !== undefined && <span className="text-[15px] font-semibold tabular-nums text-navy/70">{count} acara</span>}
        {href && (
          <Link href={href} className="text-[15px] font-bold hover:text-brand">
            Lihat semua
          </Link>
        )}
      </div>
    </div>
  );
}
