import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { categories, inCategory } from "@/lib/categories";

/** Kartu jelajah per kategori: label + jumlah acara di kiri, ilustrasi ikon besar miring di kanan, panah ↗. */
export function CategoryTiles({ events }: { events: EventSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => {
        const count = events.filter(inCategory(category)).length;
        const Icon = category.icon;
        return (
          <li key={category.slug}>
            <Link
              href={`/?kategori=${category.slug}`}
              className="group relative flex h-[112px] overflow-hidden rounded-card border border-line bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="relative z-10 flex flex-col justify-between">
                <div>
                  <p className="text-[15px] font-semibold leading-snug">{category.label}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{count ? `${count} acara` : "Segera hadir"}</p>
                </div>
                <ArrowUpRight aria-hidden className="size-5 text-brand transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </div>
              {/* Ilustrasi: lingkaran warna token + ikon besar, miring seperti stiker. */}
              <span
                aria-hidden
                className={cn(
                  "absolute -bottom-5 -right-4 flex size-24 rotate-[-12deg] items-center justify-center rounded-[28px] transition-transform duration-300 group-hover:rotate-[-4deg] group-hover:scale-105",
                  category.tone,
                )}
              >
                <Icon className="size-11" strokeWidth={1.75} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
