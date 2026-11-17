import Link from "next/link";
import { CalendarDays, CalendarRange, LayoutGrid, Ticket, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type CatalogFilter = "semua" | "minggu" | "bulan" | "gratis";

export const catalogFilters: Array<{ value: CatalogFilter; label: string; icon: LucideIcon; tint: string }> = [
  { value: "semua", label: "Semua", icon: LayoutGrid, tint: "text-navy" },
  { value: "minggu", label: "Minggu ini", icon: CalendarDays, tint: "text-teal" },
  { value: "bulan", label: "Bulan ini", icon: CalendarRange, tint: "text-sun" },
  { value: "gratis", label: "Gratis", icon: Ticket, tint: "text-brand" },
];

export function parseFilter(value: string | string[] | undefined): CatalogFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return catalogFilters.some((filter) => filter.value === raw) ? (raw as CatalogFilter) : "semua";
}

/**
 * Chip filter berupa link, jadi filter bisa dibagikan lewat URL dan jalan tanpa JavaScript.
 * `active` kosong = tidak ada chip yang aktif (mis. sedang melihat satu kategori).
 */
export function CatalogFilters({ active, q }: { active?: CatalogFilter; q?: string }) {
  return (
    <nav aria-label="Filter acara" className="flex gap-2.5 overflow-x-auto pb-1">
      {catalogFilters.map((filter) => {
        const params = new URLSearchParams();
        if (filter.value !== "semua") params.set("filter", filter.value);
        if (q) params.set("q", q);
        const href = params.size ? `/?${params}` : "/";
        const isActive = filter.value === active;
        return (
          <Link
            key={filter.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              // Pil seragam ala Loket: ikon berwarna di kiri; aktif = latar oranye muda, garis & teks oranye.
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors",
              isActive ? "border-brand bg-brand/10 text-brand" : "border-navy/15 bg-white text-navy hover:border-navy/30 hover:bg-navy/[0.03]",
            )}
          >
            <filter.icon aria-hidden className={cn("size-4", isActive ? "text-brand" : filter.tint)} strokeWidth={2.25} />
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
