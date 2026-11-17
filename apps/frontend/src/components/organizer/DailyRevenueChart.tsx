"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { SalesReport } from "@/lib/organizer/api";

type Day = SalesReport["daily"][number];

const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });
const dayLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// `date` sudah tanggal lokal acara (YYYY-MM-DD); diformat sebagai UTC supaya tidak bergeser.
const asDate = (date: string) => new Date(`${date}T00:00:00Z`);

/** Batas atas sumbu yang "bulat": 1, 2, 2.5, 5 × 10^n. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= value) ?? 10;
  return step * power;
}

/**
 * Kolom pendapatan kotor per hari (satu seri, tanpa legenda; judul section menamai serinya).
 * Hover/fokus kolom → tooltip; nilai yang sama tersedia di tabel di bawahnya.
 */
export function DailyRevenueChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const max = niceMax(Math.max(...days.map((day) => day.grossRevenue)));
  const ticks = [max, max / 2, 0];
  // Label tanggal di bawah: maksimal ~10 supaya tidak bertumpuk.
  const labelEvery = Math.max(1, Math.ceil(days.length / 10));
  const current = active === null ? null : days[active];

  return (
    <div className="relative">
      <div className="flex gap-3">
        {/* Sumbu Y */}
        <div className="relative h-[200px] w-14 shrink-0 text-right text-[12px] tabular-nums text-muted" aria-hidden>
          {ticks.map((tick, index) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}>
              {tick === 0 ? "0" : compact.format(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-[200px]" onPointerLeave={() => setActive(null)}>
            {ticks.map((tick, index) => (
              <div
                key={tick}
                aria-hidden
                className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-navy/30" : "border-line")}
                style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {days.map((day, index) => {
                const height = (day.grossRevenue / max) * 100;
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-label={`${dayLong.format(asDate(day.date))}: ${formatRupiah(day.grossRevenue, { freeLabel: false })}, ${day.ticketsSold} tiket, ${day.ordersPaid} pesanan`}
                    aria-describedby={active === index ? tooltipId : undefined}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    // Area sentuh selebar slot & setinggi grafik; kolom yang terlihat di dalamnya maks. 24px.
                    className="group flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-offset-0"
                  >
                    <span
                      className={cn(
                        "block w-full max-w-6 rounded-t-[4px] bg-teal transition-opacity",
                        active !== null && active !== index && "opacity-40",
                      )}
                      style={{ height: `${Math.max(height, day.grossRevenue > 0 ? 1.5 : 0)}%` }}
                    />
                  </button>
                );
              })}
            </div>

            {current && active !== null && (
              <div
                id={tooltipId}
                role="tooltip"
                className="pointer-events-none absolute top-2 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-navy px-3 py-2 text-[13px] text-cream shadow-card-hover"
                style={{ left: `clamp(110px, ${((active + 0.5) / days.length) * 100}%, calc(100% - 110px))` }}
              >
                <p className="font-semibold">{dayLong.format(asDate(current.date))}</p>
                <p className="tabular-nums">{formatRupiah(current.grossRevenue, { freeLabel: false })}</p>
                <p className="tabular-nums text-cream/75">
                  {current.ticketsSold} tiket · {current.ordersPaid} pesanan
                </p>
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-[2px] text-[12px] text-muted" aria-hidden>
            {days.map((day, index) => (
              <span key={day.date} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                {index % labelEvery === 0 ? dayLabel.format(asDate(day.date)) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tabel pengganti grafik (aksesibel & bisa disalin). */
export function DailyRevenueTable({ days, timeZone }: { days: Day[]; timeZone: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-[14px]">
        <caption className="sr-only">Penjualan per hari, tanggal dalam zona {timeZone}</caption>
        <thead>
          <tr className="border-b border-line text-[13px] text-muted">
            <th className="py-2 pr-4 font-semibold">Tanggal</th>
            <th className="py-2 pr-4 text-right font-semibold">Pesanan lunas</th>
            <th className="py-2 pr-4 text-right font-semibold">Tiket</th>
            <th className="py-2 text-right font-semibold">Pendapatan kotor</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {days.map((day) => (
            <tr key={day.date} className="border-b border-line">
              <td className="py-2 pr-4">{dayLong.format(asDate(day.date))}</td>
              <td className="py-2 pr-4 text-right">{day.ordersPaid}</td>
              <td className="py-2 pr-4 text-right">{day.ticketsSold}</td>
              <td className="py-2 text-right">{formatRupiah(day.grossRevenue, { freeLabel: false })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
