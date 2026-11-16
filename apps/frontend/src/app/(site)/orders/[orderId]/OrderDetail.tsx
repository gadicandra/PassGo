"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Event, Order } from "@/types/api";
import { Poster } from "@/components/event/Poster";
import { TicketStub } from "@/components/event/TicketStub";
import { OrderSummaryStub } from "@/components/order/OrderSummaryStub";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { ticketStatusLabel, toneClass } from "@/lib/status";

const POLL_MS = 5000;

const PAYMENT_LABELS: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bank_transfer: "Transfer bank",
  echannel: "Mandiri Bill",
  credit_card: "Kartu kredit",
  cstore: "Gerai retail",
  free: "Gratis",
};

/** Nama metode bayar Midtrans yang enak dibaca; tipe yang tidak dikenal dirapikan seadanya. */
const paymentLabel = (type: string) =>
  PAYMENT_LABELS[type.toLowerCase()] ?? type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function OrderDetail({ orderId }: { orderId: string }) {
  const { status } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  // Respons pesanan belum memuat judul/tanggal acara, jadi acaranya diambil terpisah.
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"sync" | "cancel" | "email" | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await api<Order>(`/orders/${orderId}`));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? "Pesanan tidak ditemukan." : "Gagal memuat pesanan.");
    }
  }, [orderId]);

  // Pulang dari Midtrans: tanyakan status terkini ke server, karena callback browser bukan bukti bayar.
  useEffect(() => {
    if (status !== "authenticated") return;
    api<Order>(`/orders/${orderId}/payment/sync`, { method: "POST" })
      .then(setOrder)
      .catch(() => load());
  }, [status, orderId, load]);

  const eventId = order?.eventId;
  useEffect(() => {
    if (!eventId) return;
    api<Event>(`/events/${eventId}`)
      .then(setEvent)
      .catch(() => undefined);
  }, [eventId]);

  // Selama menunggu pembayaran, cek berkala sampai webhook Midtrans masuk.
  useEffect(() => {
    if (order?.status !== "PENDING_PAYMENT") return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [order?.status, load]);

  async function action(kind: "sync" | "cancel" | "email") {
    setBusy(kind);
    try {
      if (kind === "sync") {
        setOrder(await api<Order>(`/orders/${orderId}/payment/sync`, { method: "POST" }));
        toast.info("Status pembayaran diperbarui.");
      } else if (kind === "cancel") {
        setOrder(await api<Order>(`/orders/${orderId}/cancel`, { method: "POST", body: {} }));
        toast.success("Pesanan dibatalkan.");
      } else {
        await api(`/orders/${orderId}/ticket-email`, { method: "POST" });
        toast.success("E-tiket dikirim ulang ke email kamu.");
        await load();
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "order-already-paid") {
        toast.info("Pembayaran ternyata sudah masuk.");
        await load();
      } else {
        toast.error(caught instanceof ApiError ? caught.message : "Gagal. Coba lagi.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <h1 className="font-display text-[44px] font-extrabold leading-none">Pesanan</h1>
        <p className="text-muted">{error}</p>
        <Link href="/orders" className="font-semibold underline underline-offset-4">
          Pesanan saya
        </Link>
      </div>
    );
  }

  if (status !== "authenticated" || !order) {
    return (
      <div className="grid gap-10 lg:grid-cols-12" aria-busy aria-label="Memuat pesanan">
        <Skeleton className="h-64 lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    );
  }

  const stubEvent = event ?? {
    id: order.eventId,
    title: "Memuat acara",
    startAt: order.createdAt,
    timezone: "Asia/Jakarta",
    posterUrl: null,
    status: "PUBLISHED" as const,
    salesStatus: "ON_SALE" as const,
  };

  return (
    <>
      <Link href="/orders" className="text-[15px] font-semibold hover:text-brand">
        ← Pesanan saya
      </Link>
      <p className="mt-4 font-mono text-[18px]">{order.orderNumber}</p>

      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <StatusBlock order={order} busy={busy} onAction={action} />

          {order.status === "PAID" && order.refundStatus !== "NOT_REQUIRED" && (
            <p className={cn("rounded-md px-4 py-3 text-[15px]", order.refundStatus === "REQUIRED" ? "bg-sun/30" : "border border-line bg-white")}>
              {order.refundStatus === "REQUIRED"
                ? "Refund sedang diproses panitia."
                : `${formatRupiah(order.refundAmount ?? order.total)} sudah dikembalikan${order.refundedAt ? ` pada ${formatDate(order.refundedAt)}` : ""}.`}
            </p>
          )}

          {order.tickets.length > 0 && (
            <section>
              <h2 className="text-[20px] font-semibold">Tiket</h2>
              <div className="mt-4 grid gap-4">
                {order.tickets.map((ticket, index) => {
                  const label = ticketStatusLabel[ticket.status];
                  return (
                    <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="group">
                      <TicketStub thumb={<Poster event={stubEvent} size="sm" tone={index} />} thumbWidth={110}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold group-hover:text-brand">{ticket.holderName}</p>
                            <p className="text-[14px] text-muted">{ticket.ticketTypeName}</p>
                          </div>
                          {ticket.status !== "VALID" && <span className={cn("text-[14px] font-semibold", toneClass[label.tone])}>{label.label}</span>}
                        </div>
                        <p className="font-mono text-[14px]">{ticket.codeMasked}</p>
                      </TicketStub>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <OrderSummaryStub
              event={stubEvent}
              lines={order.items.map((item) => ({ label: `${item.quantity} × ${item.ticketTypeName}`, amount: item.lineTotal }))}
              total={order.total}
              footer={
                <dl className="mt-3 grid grid-cols-[80px_1fr] gap-y-1 border-t border-line pt-3 text-[14px]">
                  <dt className="text-muted">Dibuat</dt>
                  <dd>{formatDateTime(order.createdAt)}</dd>
                  {order.payment?.paymentType && (
                    <>
                      <dt className="text-muted">Metode</dt>
                      <dd>{paymentLabel(order.payment.paymentType)}</dd>
                    </>
                  )}
                </dl>
              }
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function StatusBlock({
  order,
  busy,
  onAction,
}: {
  order: Order;
  busy: "sync" | "cancel" | "email" | null;
  onAction: (kind: "sync" | "cancel" | "email") => void;
}) {
  if (order.status === "PENDING_PAYMENT") {
    return <PendingBlock order={order} busy={busy} onAction={onAction} />;
  }

  if (order.status === "PAID") {
    const emailFailed = order.ticketEmailStatus === "FAILED";
    return (
      <section className="rounded-card bg-teal p-6 text-cream md:p-8">
        <h1 className="font-display text-[32px] font-extrabold leading-tight">Pembayaran diterima</h1>
        <p className="mt-2">
          {emailFailed
            ? "Email gagal terkirim."
            : order.ticketEmailStatus === "PENDING"
              ? `E-tiket sedang dikirim ke ${order.buyerEmail}.`
              : `E-tiket terkirim ke ${order.buyerEmail}.`}{" "}
          {order.tickets.some((ticket) => ticket.status === "VALID") && (
            <button
              type="button"
              onClick={() => onAction("email")}
              disabled={busy === "email"}
              className="font-semibold underline underline-offset-4 disabled:opacity-60"
            >
              {busy === "email" ? "Mengirim" : "Kirim ulang"}
            </button>
          )}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border-2 border-navy bg-cream p-6 md:p-8">
      <h1 className="font-display text-[32px] font-extrabold leading-tight">
        {order.status === "EXPIRED" ? "Waktu pembayaran habis" : "Pesanan dibatalkan"}
      </h1>
      {order.status === "CANCELLED" && order.cancelReason && <p className="mt-2 text-muted">{order.cancelReason}</p>}
      <ButtonLink href="/" variant="dark" className="mt-6">
        Pesan lagi
      </ButtonLink>
    </section>
  );
}

function PendingBlock({
  order,
  busy,
  onAction,
}: {
  order: Order;
  busy: "sync" | "cancel" | "email" | null;
  onAction: (kind: "sync" | "cancel" | "email") => void;
}) {
  // Konfirmasi batal di dalam blok, bukan dialog bawaan browser.
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="rounded-card bg-sun p-6 md:p-8">
      <h1 className="font-display text-[32px] font-extrabold leading-tight">Menunggu pembayaran</h1>
      {order.expiresAt && <Countdown until={order.expiresAt} />}
      {confirming ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-navy/20 pt-5" role="alertdialog" aria-label="Konfirmasi batal">
          <p className="w-full font-semibold">Batalkan pesanan ini? Tiket yang ditahan akan dilepas.</p>
          <Button variant="dark" loading={busy === "cancel"} onClick={() => onAction("cancel")}>
            Ya, batalkan
          </Button>
          <Button variant="text" onClick={() => setConfirming(false)} disabled={busy === "cancel"}>
            Tidak jadi
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {order.payment?.snapRedirectUrl && (
            <ButtonLink href={order.payment.snapRedirectUrl} variant="dark">
              Lanjutkan pembayaran
            </ButtonLink>
          )}
          <Button variant="text" loading={busy === "sync"} onClick={() => onAction("sync")}>
            Cek status
          </Button>
          <Button variant="text" onClick={() => setConfirming(true)}>
            Batalkan pesanan
          </Button>
        </div>
      )}
    </section>
  );
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, new Date(until).getTime() - now);
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return (
    <p className="mt-3 text-[56px] font-semibold leading-none tabular-nums" aria-label={`Sisa waktu ${minutes} menit ${seconds} detik`}>
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </p>
  );
}
