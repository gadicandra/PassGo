"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah } from "@/lib/format";
import { loadOrderRows, type OrderRow } from "@/lib/orders";
import { orderStatusLabel, refundStatusLabel, toneClass } from "@/lib/status";

export function OrderList() {
  const { requireLogin } = useAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requireLogin()) return;
    loadOrderRows()
      .then(setOrders)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Gagal memuat pesanan."));
  }, [requireLogin]);

  if (error) return <p className="mt-8 text-danger">{error}</p>;

  if (!orders) {
    return (
      <div className="mt-8 flex flex-col gap-3" aria-busy aria-label="Memuat pesanan">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-start gap-2">
        <p className="text-[18px] font-semibold">Belum ada pesanan.</p>
        <Link href="/" className="font-semibold text-brand underline-offset-4 hover:underline">
          Lihat acara
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-line border-y border-line">
      {orders.map((order) => {
        const label = refundStatusLabel[order.refundStatus] ?? orderStatusLabel[order.status];
        return (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="grid grid-cols-2 gap-x-4 gap-y-1 py-4 transition-colors hover:bg-navy/[0.03] md:grid-cols-[170px_1fr_120px_80px_120px_160px] md:items-center"
            >
              <span className="font-mono text-[14px]">{order.orderNumber}</span>
              <span className="col-span-2 font-semibold md:col-span-1">{order.eventTitle}</span>
              <span className="text-[14px] text-muted">{order.eventStartAt ? formatDate(order.eventStartAt) : ""}</span>
              <span className="text-[14px] text-muted">{order.ticketCount} tiket</span>
              <span className="font-semibold tabular-nums md:text-right">{formatRupiah(order.total)}</span>
              <span className={cn("text-[14px] font-semibold md:text-right", toneClass[label.tone])}>{label.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
