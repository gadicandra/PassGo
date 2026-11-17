"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { loadOrderRows, type OrderRow } from "@/lib/orders";
import { orderStatusLabel, refundStatusLabel, toneClass } from "@/lib/status";
import { RefundPanel } from "./RefundPanel";

type Filter = "all" | "pending" | "paid" | "expired" | "refund" | "cancelled";

const filters: Array<{ value: Filter; label: string; match: (row: OrderRow) => boolean }> = [
  { value: "all", label: "Semua", match: () => true },
  { value: "pending", label: "Menunggu", match: (row) => row.status === "PENDING_PAYMENT" },
  { value: "paid", label: "Lunas", match: (row) => row.status === "PAID" && row.refundStatus === "NOT_REQUIRED" },
  { value: "refund", label: "Perlu refund", match: (row) => row.refundStatus === "REQUIRED" },
  { value: "expired", label: "Kedaluwarsa", match: (row) => row.status === "EXPIRED" },
  { value: "cancelled", label: "Dibatalkan", match: (row) => row.status === "CANCELLED" },
];

const createdFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function OrganizerOrders() {
  const { user, status } = useAuth();
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);

  // Di layar sempit panel ada di atas tabel; gulir ke sana supaya hasil klik "Detail" terlihat.
  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 1023px)").matches) {
      panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  const load = useCallback(() => {
    loadOrderRows()
      .then(setRows)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Gagal memuat pesanan."));
  }, []);

  useEffect(() => {
    if (status === "authenticated" && user?.role === "ORGANIZER") load();
  }, [status, user, load]);

  const forbidden = status === "authenticated" && user?.role !== "ORGANIZER";

  const visible = useMemo(() => {
    if (!rows) return [];
    const match = filters.find((item) => item.value === filter)!.match;
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        match(row) &&
        (!needle ||
          row.orderNumber.toLowerCase().includes(needle) ||
          row.buyerName.toLowerCase().includes(needle) ||
          row.buyerEmail.toLowerCase().includes(needle)),
    );
  }, [rows, filter, query]);

  if (forbidden) return <p className="text-muted">Halaman ini khusus organizer.</p>;
  if (error) return <p className="text-danger">{error}</p>;

  const selectedRow = rows?.find((row) => row.id === selected) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Pesanan</h1>
        <div className="w-full max-w-[280px]">
          <label htmlFor="order-search" className="sr-only">
            Cari nomor atau pembeli
          </label>
          <input
            id="order-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor atau pembeli"
            className="h-11 w-full rounded-md border border-navy/25 bg-white px-3 text-[15px] placeholder:text-muted focus:border-navy focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2" role="tablist" aria-label="Filter status">
        {filters.map((item) => {
          const count = rows?.filter(item.match).length;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "text-[15px] font-semibold underline-offset-8",
                filter === item.value ? "text-navy underline decoration-brand decoration-[3px]" : "text-muted hover:text-navy",
              )}
            >
              {item.label} {count !== undefined && <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className={cn("min-w-0 overflow-x-auto", selectedRow ? "lg:col-span-8" : "lg:col-span-12")}>
          {!rows ? (
            <div className="flex flex-col gap-2" aria-busy aria-label="Memuat pesanan">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-muted">Tidak ada pesanan yang cocok.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] font-semibold text-muted">
                  <th className="py-3 pr-4 font-semibold">Nomor</th>
                  <th className="py-3 pr-4 font-semibold">Pembeli</th>
                  <th className="py-3 pr-4 font-semibold">Acara</th>
                  <th className="py-3 pr-4 text-right font-semibold">Tiket</th>
                  <th className="py-3 pr-4 text-right font-semibold">Total</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Dibuat</th>
                  <th className="py-3 font-semibold">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const label = refundStatusLabel[row.refundStatus] ?? orderStatusLabel[row.status];
                  return (
                    <tr key={row.id} className={cn("h-12 border-b border-line", selected === row.id && "bg-sun/15")}>
                      <td className="whitespace-nowrap pr-4 font-mono text-[14px]">{row.orderNumber}</td>
                      <td className="whitespace-nowrap pr-4">{row.buyerName}</td>
                      <td className="max-w-[220px] truncate pr-4">{row.eventTitle}</td>
                      <td className="pr-4 text-right tabular-nums">{row.ticketCount}</td>
                      <td className="pr-4 text-right tabular-nums">{formatRupiah(row.total)}</td>
                      <td className={cn("pr-4 font-semibold", toneClass[label.tone])}>{label.label}</td>
                      <td className="whitespace-nowrap pr-4 text-muted">{createdFormat.format(new Date(row.createdAt))}</td>
                      <td className="whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelected(row.id)}
                          className="font-semibold underline underline-offset-4 hover:text-brand"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {rows && <p className="mt-4 text-[14px] text-muted">{visible.length} dari {rows.length} pesanan</p>}
        </div>

        {selectedRow && (
          <aside ref={panel} className="order-first scroll-mt-24 lg:order-last lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <RefundPanel
                key={selectedRow.id}
                orderId={selectedRow.id}
                onClose={() => setSelected(null)}
                onChanged={load}
              />
              <Link href={`/orders/${selectedRow.id}`} className="mt-3 inline-block text-[14px] font-semibold underline underline-offset-4">
                Buka halaman pesanan
              </Link>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
