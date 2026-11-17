"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Order } from "@/types/api";
import { Perforation } from "@/components/event/TicketStub";
import { Button } from "@/components/ui/Button";
import { FormError, TextArea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";
import { orderStatusLabel, refundStatusLabel, toneClass } from "@/lib/status";
import { cn } from "@/lib/cn";

/**
 * Panel detail pesanan untuk organizer + form "Catat refund".
 * Refund dilakukan di luar sistem (dashboard Midtrans / transfer); di sini hanya dicatat.
 * v1 backend: hanya refund penuh, jadi jumlah = total pesanan dan tidak bisa diubah.
 */
export function RefundPanel({ orderId, onClose, onChanged }: { orderId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [noteError, setNoteError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api<Order>(`/orders/${orderId}`)
      .then((loaded) => active && setOrder(loaded))
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof ApiError && error.status === 404 ? "Pesanan tidak ditemukan." : "Gagal memuat pesanan.");
      });
    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  if (!order) {
    if (!loadError) return <Skeleton className="h-80 w-full rounded-card" />;
    return (
      <div className="rounded-card border border-navy/15 bg-white p-6 shadow-card">
        <FormError>{loadError}</FormError>
        <div className="mt-4 flex gap-3">
          <Button
            variant="dark"
            size="sm"
            onClick={() => {
              setLoadError(undefined);
              setAttempt((count) => count + 1);
            }}
          >
            Coba lagi
          </Button>
          <Button variant="text" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    );
  }

  const refundable =
    order.total > 0 &&
    order.refundStatus !== "REFUNDED" &&
    (order.refundStatus === "REQUIRED" || order.status === "PAID");
  const label = refundStatusLabel[order.refundStatus] ?? orderStatusLabel[order.status];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const note = String(new FormData(event.currentTarget).get("note") ?? "").trim();
    if (note.length < 5) {
      setNoteError("Catatan minimal 5 karakter, misalnya bukti transfer.");
      return;
    }
    setNoteError(undefined);
    setFormError(undefined);
    setSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const updated = await api<Order>(`/orders/${order.id}/refund`, {
        method: "POST",
        idempotencyKey: idempotencyKey.current,
        body: { amount: order.total, note },
      });
      setOrder(updated);
      toast.success(`Refund ${formatRupiah(order.total)} dicatat.`);
      onChanged();
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) idempotencyKey.current = null;
      setFormError(
        error instanceof ApiError && error.code === "order-has-checked-in-tickets"
          ? "Ada tiket yang sudah dipakai masuk, refund tidak bisa dicatat."
          : error instanceof ApiError && error.code === "order-not-refundable"
            ? "Pesanan ini tidak bisa di-refund."
            : error instanceof ApiError
              ? error.message
              : "Gagal mencatat refund.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[16px]">{order.orderNumber}</p>
          <button type="button" onClick={onClose} aria-label="Tutup detail" className="text-[20px] leading-none text-muted hover:text-navy">
            ×
          </button>
        </div>
        <p className="mt-2 font-semibold">{order.buyerName}</p>
        <p className="text-[14px] text-muted">{order.buyerEmail}</p>
        <p className={cn("mt-3 text-[15px] font-semibold", toneClass[label.tone])}>{label.label}</p>
        {order.refundStatus === "REQUIRED" && (
          <p className="mt-1 text-[14px] text-danger">Dana pembeli perlu dikembalikan.</p>
        )}
      </div>

      <Perforation className="my-0" />

      <div className="p-5">
        <ul className="flex flex-col gap-1 text-[15px]">
          {order.items.map((item) => (
            <li key={item.ticketTypeId} className="flex justify-between gap-3">
              <span>
                {item.quantity} × {item.ticketTypeName}
              </span>
              <span className="tabular-nums">{formatRupiah(item.lineTotal, { freeLabel: false })}</span>
            </li>
          ))}
          <li className="mt-1 flex justify-between gap-3 border-t border-line pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatRupiah(order.total)}</span>
          </li>
        </ul>

        {order.refundStatus === "REFUNDED" ? (
          <p className="mt-5 text-[15px]">
            {formatRupiah(order.refundAmount ?? order.total)} dikembalikan
            {order.refundedAt ? ` pada ${formatDate(order.refundedAt)}` : ""}.
            {order.refundNote && <span className="mt-1 block text-[14px] text-muted">{order.refundNote}</span>}
          </p>
        ) : refundable ? (
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold">Jumlah refund</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums">{formatRupiah(order.total)}</p>
            </div>
            <TextArea
              name="note"
              label="Catatan"
              rows={3}
              maxLength={500}
              placeholder="Ditransfer ke BCA a.n. pembeli, 28 Nov"
              error={noteError}
            />
            <FormError>{formError}</FormError>
            <Button type="submit" loading={submitting} className="self-start">
              Catat refund
            </Button>
          </form>
        ) : (
          <>
            <FormError>{formError}</FormError>
            <p className="mt-5 text-[14px] text-muted">
              {order.total === 0 ? "Pesanan gratis, tidak ada yang perlu dikembalikan." : "Pesanan ini tidak perlu di-refund."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
