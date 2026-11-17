"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Event, Order, User } from "@/types/api";
import { OrderSummaryStub } from "@/components/order/OrderSummaryStub";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { ApiError, api } from "@/lib/api";
import { formatRupiah } from "@/lib/format";

type Items = Record<string, number>;

/** Nomor HP Indonesia: 08xxxxxxxx atau +628xxxxxxxx, 10-15 digit. Kosong boleh. */
const PHONE = /^(\+62|62|0)8\d{7,12}$/;

interface Notice {
  message: string;
  action?: ReactNode;
}

export function CheckoutForm({ event, initialItems }: { event: Event; initialItems: Items }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(event.ticketTypes.map((type) => [type.id, type.price])),
  );
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Satu key per aksi beli; dipakai ulang kalau pengguna menekan "Coba lagi" untuk aksi yang sama.
  const idempotencyKey = useRef<string | null>(null);

  const eventHref = `/events/${event.slug}`;
  const lines = useMemo(
    () =>
      event.ticketTypes
        .filter((type) => initialItems[type.id])
        .map((type) => ({ type, quantity: initialItems[type.id], unitPrice: prices[type.id] })),
    [event.ticketTypes, initialItems, prices],
  );
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  useEffect(() => {
    if (status !== "authenticated") return;
    api<User>("/me")
      .then((me) => setPhone((current) => current || me.phone || ""))
      .catch(() => undefined);
  }, [status]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12" aria-busy>
        <Skeleton className="h-80 lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    );
  }

  if (user.role !== "ATTENDEE") {
    return (
      <EmptyState
        title="Checkout"
        message="Pembelian tiket hanya untuk akun peserta. Masuk dengan akun peserta untuk membeli."
        href={eventHref}
      />
    );
  }

  if (lines.length === 0) {
    return <EmptyState title="Checkout" message="Belum ada tiket yang dipilih." href={eventHref} />;
  }

  async function resendVerification() {
    try {
      await api("/auth/email-verification", { method: "POST" });
      toast.success("Link verifikasi dikirim ke email kamu.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengirim email.");
    }
  }

  function noticeFor(error: ApiError): Notice {
    const problem = error.problem;
    const nameOf = (id: unknown) => event.ticketTypes.find((type) => type.id === id)?.name ?? "Tiket";
    const changeLink = (
      <Link href={eventHref} className="font-semibold underline underline-offset-4">
        Ubah jumlah
      </Link>
    );
    switch (error.code) {
      case "quota-exceeded": {
        const item = problem.errors?.[0];
        return {
          message: item?.available !== undefined ? `${nameOf(item.ticketTypeId)} tinggal ${item.available} tiket.` : "Kuota tiket tidak mencukupi.",
          action: changeLink,
        };
      }
      case "price-changed": {
        const item = problem.errors?.[0];
        return {
          message:
            item?.currentUnitPrice !== undefined
              ? `Harga ${nameOf(item.ticketTypeId)} berubah jadi ${formatRupiah(Number(item.currentUnitPrice))}.`
              : "Harga tiket berubah.",
          action: (
            <button
              type="button"
              className="font-semibold underline underline-offset-4"
              onClick={() => {
                setPrices((current) => {
                  const next = { ...current };
                  for (const changed of problem.errors ?? []) {
                    if (typeof changed.ticketTypeId === "string") next[changed.ticketTypeId] = Number(changed.currentUnitPrice);
                  }
                  return next;
                });
                idempotencyKey.current = null;
                setNotice(null);
              }}
            >
              Perbarui
            </button>
          ),
        };
      }
      case "pending-order-exists":
        return {
          message: "Kamu masih punya pesanan yang belum dibayar untuk acara ini.",
          action: (
            <Link href={`/orders/${problem.orderId}`} className="font-semibold underline underline-offset-4">
              Lihat pesanan
            </Link>
          ),
        };
      case "max-per-user-exceeded":
        return {
          message:
            typeof problem.remaining === "number" && problem.remaining > 0
              ? `Kamu hanya bisa beli ${problem.remaining} tiket lagi.`
              : "Kamu sudah mencapai batas tiket untuk acara ini.",
          action: changeLink,
        };
      case "max-per-order-exceeded":
        return { message: "Jumlah tiket melebihi batas per pesanan.", action: changeLink };
      case "ticket-type-not-on-sale":
      case "event-not-on-sale":
        return { message: "Penjualan tiket ini sudah ditutup.", action: changeLink };
      case "email-not-verified":
        return {
          message: "Verifikasi email dulu sebelum membeli.",
          action: (
            <button type="button" className="font-semibold underline underline-offset-4" onClick={resendVerification}>
              Kirim ulang
            </button>
          ),
        };
      case "payment-gateway-error":
        return { message: "Pembayaran sedang bermasalah. Coba lagi sebentar." };
      default:
        return { message: error.message || "Pesanan gagal dibuat." };
    }
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const trimmed = phone.replace(/[\s-]/g, "");
    if (trimmed && !PHONE.test(trimmed)) {
      setPhoneError("Format nomor tidak valid. Contoh: 081234567890.");
      return;
    }
    setPhoneError(undefined);
    setNotice(null);
    setSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        idempotencyKey: idempotencyKey.current,
        body: {
          eventId: event.id,
          items: lines.map((line) => ({ ticketTypeId: line.type.id, quantity: line.quantity, expectedUnitPrice: line.unitPrice })),
          ...(trimmed ? { buyerPhone: trimmed.startsWith("0") ? `+62${trimmed.slice(1)}` : trimmed.startsWith("62") ? `+${trimmed}` : trimmed } : {}),
        },
      });
      // Pesanan gratis langsung lunas; berbayar dilanjutkan ke halaman Midtrans, lalu Midtrans mengembalikan ke /orders/:id.
      if (order.payment?.snapRedirectUrl) window.location.assign(order.payment.snapRedirectUrl);
      else router.push(`/orders/${order.id}`);
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError) {
        // Error 4xx sudah final untuk key ini; aksi berikutnya pakai key baru. 5xx boleh diulang dengan key sama.
        if (error.status < 500) idempotencyKey.current = null;
        setNotice(noticeFor(error));
      } else {
        setNotice({ message: "Pesanan gagal dibuat. Coba lagi." });
      }
    }
  }

  const free = total === 0;

  return (
    <>
      <Link href={eventHref} className="text-[15px] font-semibold hover:text-brand">
        ← Kembali ke acara
      </Link>
      <h1 className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <form onSubmit={submit} noValidate className="order-2 flex flex-col gap-8 lg:order-1 lg:col-span-7">
          <section>
            <h2 className="text-[20px] font-semibold">Pemesan</h2>
            <dl className="mt-4 grid grid-cols-[80px_minmax(0,1fr)] gap-y-2 text-[15px]">
              <dt className="text-muted">Nama</dt>
              <dd className="font-semibold">{user.name}</dd>
              <dt className="text-muted">Email</dt>
              <dd className="font-semibold [overflow-wrap:anywhere]">{user.email}</dd>
            </dl>
            <p className="mt-2 text-[14px] text-muted">E-tiket dikirim ke email ini.</p>
            <Field
              name="phone"
              label="Nomor HP (opsional)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081234567890"
              value={phone}
              onChange={(change) => setPhone(change.target.value)}
              error={phoneError}
              className="mt-5 max-w-[240px]"
            />
          </section>

          {!free && (
            <section>
              <h2 className="text-[20px] font-semibold">Pembayaran</h2>
              <p className="mt-2 text-[15px] text-navy/80">QRIS, e-wallet, transfer bank, atau kartu. Dipilih di langkah berikutnya.</p>
            </section>
          )}

          {notice && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-[15px] text-danger">
              <span>{notice.message}</span>
              {notice.action}
            </div>
          )}

          <Button type="submit" loading={submitting} className="w-full sm:w-auto sm:self-start">
            {submitting ? "Memproses" : free ? "Ambil tiket" : "Bayar sekarang"}
          </Button>
        </form>

        <aside className="order-1 lg:order-2 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <OrderSummaryStub
              event={event}
              lines={lines.map((line) => ({ label: `${line.quantity} × ${line.type.name}`, amount: line.unitPrice * line.quantity }))}
              total={total}
              footer={
                <Link href={eventHref} className="mt-2 text-[14px] font-semibold underline underline-offset-4 hover:text-brand">
                  Ubah pesanan
                </Link>
              }
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function EmptyState({ title, message, href }: { title: string; message: string; href: string }) {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">{title}</h1>
      <p className="text-muted">{message}</p>
      <Link href={href} className="font-semibold underline underline-offset-4 hover:text-brand">
        Kembali ke acara
      </Link>
    </div>
  );
}
