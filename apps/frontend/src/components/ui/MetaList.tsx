import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type MetaItem = { icon: LucideIcon; children: ReactNode };

/**
 * Baris keterangan berikon (tanggal, jam, tempat). Ikon menggantikan pemisah titik "xx · yy":
 * tiap bagian utuh dan tidak patah di tengah, sama dengan hero beranda.
 */
export function MetaList({ items, className }: { items: Array<MetaItem | false | null | undefined>; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {items.filter((item): item is MetaItem => !!item).map(({ icon: Icon, children }, index) => (
        <li key={index} className="inline-flex min-w-0 items-center gap-1.5">
          <Icon aria-hidden className="size-[15px] shrink-0 opacity-70" />
          <span className="min-w-0">{children}</span>
        </li>
      ))}
    </ul>
  );
}
