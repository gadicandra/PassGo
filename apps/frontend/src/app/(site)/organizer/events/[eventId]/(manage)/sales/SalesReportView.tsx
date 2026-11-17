"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DailyRevenueChart, DailyRevenueTable } from "@/components/organizer/DailyRevenueChart";
import { useManagedEvent } from "@/components/organizer/EventManage";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { OrderStatus } from "@/types/api";
import { cn } from "@/lib/cn";
import { formatRupiah, formatTime } from "@/lib/format";
import { getSalesReport, type SalesReport } from "@/lib/organizer/api";
import { errorMessage } from "@/lib/organizer/errors";

const rupiah = (amount: number) => formatRupiah(amount, { freeLabel: false });

const orderStatusOrder: Array<{ status: OrderStatus; label: string }> = [
  { status: "PAID", label: "Lunas" },
  { status: "PENDING_PAYMENT", label: "Menunggu bayar" },
  { status: "EXPIRED", label: "Kedaluwarsa" },
  { status: "CANCELLED", label: "Dibatalkan" },
];

export function SalesReportView() {
  const { event } = useManagedEvent();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSalesReport(event.id);
      setReport(result.data);
      setGeneratedAt(result.meta.generatedAt);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught, "Gagal memuat laporan."));
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  // Muat pertama: setState hanya di callback promise (aturan react-hooks/set-state-in-effect).
  useEffect(() => {
    let active = true;
    getSalesReport(event.id)
      .then((result) => {
        if (!active) return;
        setReport(result.data);
        setGeneratedAt(result.meta.generatedAt);
      })
      .catch((caught) => active && setError(errorMessage(caught, "Gagal memuat laporan.")));
    return () => {
      active = false;
    };
  }, [event.id]);

  if (error && !report) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-danger">{error}</p>
        <Button variant="dark" onClick={load} loading={loading}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col gap-4" aria-busy aria-label="Memuat laporan">
        <Skeleton className="h-16 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const { totals } = report;
  const hasSales = totals.ordersByStatus.PAID > 0;

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="sales-summary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="sales-summary" className="text-[15px] font-semibold text-muted">
              Pendapatan bersih
            </h2>
            <p className="mt-1 text-[48px] font-semibold leading-none tracking-[-0.02em]">{rupiah(totals.netRevenue)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[14px] text-muted">
            {error ? (
              <span className="text-danger" role="alert">
                {error}
              </span>
            ) : (
              generatedAt && <span>Dihitung pukul {formatTime(generatedAt, report.timezone)}</span>
            )}
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              Muat ulang
            </Button>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 md:grid-cols-4">
          <Stat label="Pendapatan kotor" value={rupiah(totals.grossRevenue)} />
          <Stat label="Sudah di-refund" value={rupiah(totals.refundedAmount)} />
          <Stat label="Tiket terjual" value={`${totals.ticketsSold} / ${totals.quota}`} />
          <Stat label="Sisa kuota" value={`${totals.ticketsAvailable}`} note={totals.ticketsReserved ? `${totals.ticketsReserved} sedang dipesan` : undefined} />
        </dl>

        <p className="mt-6 text-[14px] text-muted">
          Pesanan:{" "}
          {orderStatusOrder.map((item, index) => (
            <span key={item.status}>
              {index > 0 && " · "}
              {item.label} <span className="font-semibold tabular-nums text-navy">{totals.ordersByStatus[item.status] ?? 0}</span>
            </span>
          ))}
        </p>

        {totals.refundsRequired > 0 && (
          <p className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-[14px] text-danger">
            {totals.refundsRequired} pembayaran masuk setelah pesanannya kedaluwarsa atau dibatalkan dan perlu dikembalikan.{" "}
            <Link href="/organizer/orders" className="font-semibold underline underline-offset-4">
              Buka Pesanan
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="sales-by-type">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="sales-by-type" className="text-[20px] font-semibold">
            Per tipe tiket
          </h2>
          {report.byTicketType.length > 0 && <Legend />}
        </div>
        {report.byTicketType.length === 0 ? (
          <p className="mt-4 text-muted">Belum ada tipe tiket.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th className="py-2 pr-4 font-semibold">Tipe</th>
                  <th className="w-[34%] py-2 pr-4 font-semibold">
                    <span className="sr-only">Kuota terpakai</span>
                  </th>
                  <th className="py-2 pr-4 text-right font-semibold">Terjual</th>
                  <th className="py-2 pr-4 text-right font-semibold">Dipesan</th>
                  <th className="py-2 pr-4 text-right font-semibold">Sisa</th>
                  <th className="py-2 text-right font-semibold">Pendapatan kotor</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {report.byTicketType.map((row) => (
                  <tr key={row.ticketTypeId} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <span className="font-semibold">{row.ticketTypeName}</span>
                      <span className="block text-[13px] text-muted">{formatRupiah(row.price)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <QuotaBar sold={row.ticketsSold} reserved={row.ticketsReserved} quota={row.quota} name={row.ticketTypeName} />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {row.ticketsSold} <span className="text-muted">/ {row.quota}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">{row.ticketsReserved}</td>
                    <td className="py-3 pr-4 text-right">{row.ticketsAvailable}</td>
                    <td className="py-3 text-right">{rupiah(row.grossRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="sales-daily">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="sales-daily" className="text-[20px] font-semibold">
            Pendapatan kotor per hari
          </h2>
          {hasSales && report.daily.length > 0 && (
            <button
              type="button"
              aria-pressed={showTable}
              onClick={() => setShowTable((value) => !value)}
              className="text-[14px] font-semibold underline underline-offset-4 hover:text-brand"
            >
              {showTable ? "Lihat sebagai grafik" : "Lihat sebagai tabel"}
            </button>
          )}
        </div>
        <p className="mt-1 text-[14px] text-muted">Menurut tanggal pembayaran, zona {report.timezone}.</p>
        <div className="mt-6">
          {!hasSales || report.daily.length === 0 ? (
            <p className="text-muted">{event.status === "DRAFT" ? "Penjualan dimulai setelah acara terbit." : "Belum ada pesanan lunas."}</p>
          ) : showTable ? (
            <DailyRevenueTable days={report.daily} timeZone={report.timezone} />
          ) : (
            <DailyRevenueChart days={report.daily} />
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="mt-1 text-[22px] font-semibold leading-tight">{value}</dd>
      {note && <dd className="text-[13px] text-muted">{note}</dd>}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted" aria-label="Keterangan batang kuota">
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-3 rounded-sm bg-teal" />
        Terjual
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-3 rounded-sm bg-sun" />
        Sedang dipesan
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-3 rounded-sm bg-navy/10" />
        Sisa
      </li>
    </ul>
  );
}

/** Batang tipis satu kesatuan (kuota) yang dibagi terjual / dipesan / sisa, dengan jeda 2px antarbagian. */
function QuotaBar({ sold, reserved, quota, name }: { sold: number; reserved: number; quota: number; name: string }) {
  const pct = (value: number) => (quota > 0 ? (value / quota) * 100 : 0);
  const rest = Math.max(0, quota - sold - reserved);
  const parts = [
    { key: "sold", value: sold, className: "bg-teal" },
    { key: "reserved", value: reserved, className: "bg-sun" },
    { key: "rest", value: rest, className: "bg-navy/10" },
  ].filter((part) => part.value > 0);

  return (
    <div
      role="img"
      aria-label={`${name}: ${sold} terjual, ${reserved} sedang dipesan, ${rest} sisa dari kuota ${quota}`}
      title={`${sold} terjual · ${reserved} dipesan · ${rest} sisa`}
      className="flex h-2 w-full gap-[2px]"
    >
      {parts.map((part) => (
        <span key={part.key} className={cn("h-full rounded-full", part.className)} style={{ width: `${pct(part.value)}%` }} />
      ))}
    </div>
  );
}
