import Link from "next/link";
import { cn } from "@/lib/cn";

export type CatalogFilter = "semua" | "minggu" | "bulan" | "gratis";

export const catalogFilters: Array<{ value: CatalogFilter; label: string }> = [
  { value: "semua", label: "Semua" },
  { value: "minggu", label: "Minggu ini" },
  { value: "bulan", label: "Bulan ini" },
  { value: "gratis", label: "Gratis" },
];

export function parseFilter(value: string | string[] | undefined): CatalogFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return catalogFilters.some((filter) => filter.value === raw) ? (raw as CatalogFilter) : "semua";
}

/** Chip filter berupa link, jadi filter bisa dibagikan lewat URL dan jalan tanpa JavaScript. */
export function CatalogFilters({ active, q }: { active: CatalogFilter; q?: string }) {
  return (
    <nav aria-label="Filter acara" className="flex gap-3 overflow-x-auto pb-1">
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
              "shrink-0 rounded-lg border px-6 py-2 text-[14px] font-bold transition-colors",
              "inline-flex items-center gap-2",
              isActive
                ? "border-brand bg-brand text-white"
                : filter.value === "gratis"
                  ? "border-teal/60 bg-teal/10 text-teal hover:bg-teal/15"
                  : "border-navy/25 bg-white text-navy hover:bg-navy/5",
            )}
          >
            {filter.value === "gratis" && !isActive && <span aria-hidden className="size-2 rounded-full bg-teal" />}
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
