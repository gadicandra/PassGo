import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { categories } from "@/lib/categories";

/** Kartu jelajah per kategori: label di kiri, ilustrasi ikon besar miring di kanan, panah ↗. */
export function CategoryTiles() {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {categories.map((category, index) => {
        const Icon = category.icon;
        return (
          <li key={category.slug}>
            <Link
              href={`/?kategori=${category.slug}`}
              className="group relative flex h-[112px] overflow-hidden rounded-card border border-line bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="relative z-10 flex flex-col justify-between">
                <p className="text-[15px] font-semibold leading-snug">{category.label}</p>
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
                <Icon className="size-11 motion-safe:animate-[icon-float_3.2s_ease-in-out_infinite]" style={{ animationDelay: `${index * 0.35}s` }} strokeWidth={1.75} />
              </span>
              <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r", category.strip)} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
