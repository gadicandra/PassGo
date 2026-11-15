"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Event, TicketType } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/api/auth";
import { ApiError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { Perforation } from "./TicketStub";

type Quantities = Record<string, number>;

/** Encode pilihan tiket ke query checkout: "id:2,id:1". */
export function encodeItems(quantities: Quantities): string {
  return Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => `${id}:${quantity}`)
    .join(",");
}

// Kartu "Pilih tiket" di detail acara. Validasi di sini hanya bantuan tampilan;
// kebenaran akhir (kuota, harga, batas per akun) tetap ditentukan server saat checkout.
export function TicketPicker({ event }: { event: Event }) {
  const router = useRouter();
  const toast = useToast();
  const { status, user } = useAuth();
  const [quantities, setQuantities] = useState<Quantities>({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Varian dari desain: tamu diarahkan masuk dulu, email belum terverifikasi tidak boleh membeli (403 di server),
  // dan hanya akun peserta yang bisa membeli.
  const guest = status === "guest";
  const notAttendee = user !== null && user.role !== "ATTENDEE";
  const unverified = user !== null && user.role === "ATTENDEE" && !user.emailVerified;

  async function resendVerification() {
    setResending(true);
    try {
      await apiFetch("/auth/email-verification", { method: "POST" });
      toast.success("Link verifikasi dikirim ke email kamu.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengirim email.");
    } finally {
      setResending(false);
    }
  }

  const total = useMemo(
    () => event.ticketTypes.reduce((sum, type) => sum + type.price * (quantities[type.id] ?? 0), 0),
    [event.ticketTypes, quantities],
  );
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const perUserLimit = event.maxTicketsPerUser;
  const overUserLimit = perUserLimit !== null && count > perUserLimit;

  const closedMessage =
    event.status === "CANCELLED"
      ? "Acara ini dibatalkan."
      : event.isEnded
        ? "Acara sudah selesai."
        : event.ticketTypes.length === 0
          ? "Tiket belum tersedia."
          : null;

  function change(type: TicketType, delta: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(maxFor(type), (current[type.id] ?? 0) + delta));
      return { ...current, [type.id]: next };
    });
  }

  function buy() {
    setSubmitting(true);
    router.push(`/checkout/${event.slug}?items=${encodeItems(quantities)}`);
  }

  return (
    <div className="overflow-hidden rounded-card border border-navy/15 bg-white shadow-card">
      {unverified && !closedMessage && (
        <p className="flex flex-wrap items-center justify-between gap-2 bg-sun px-6 py-3 text-[15px]">
          <span>Verifikasi email dulu.</span>
          <button
            type="button"
            onClick={resendVerification}
            disabled={resending}
            className="font-semibold underline underline-offset-4 disabled:opacity-60"
          >
            {resending ? "Mengirim" : "Kirim ulang"}
          </button>
        </p>
      )}
      <div className="p-6">
      <h2 className="text-[20px] font-semibold">Pilih tiket</h2>

      {closedMessage ? (
        <p className="mt-4 text-muted">{closedMessage}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-line">
            {event.ticketTypes.map((type) => (
              <TicketRow
                key={type.id}
                type={type}
                quantity={quantities[type.id] ?? 0}
                onChange={(delta) => change(type, delta)}
              />
            ))}
          </ul>

          <Perforation notchBg="var(--color-cream)" className="-mx-6 my-5" />


          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-[24px] font-semibold tabular-nums">{formatRupiah(total, { freeLabel: count > 0 })}</span>
          </div>

          {overUserLimit && (
            <p role="alert" className="mt-3 text-sm text-danger">
              Maksimal {perUserLimit} tiket per akun untuk acara ini.
            </p>
          )}

          <Button
            className="mt-4 w-full"
            disabled={count === 0 || overUserLimit || unverified || notAttendee}
            loading={submitting}
            onClick={buy}
          >
            {guest ? "Masuk untuk membeli" : "Beli tiket"}
          </Button>
          {notAttendee ? (
            <p className="mt-3 text-sm text-muted">Pembelian hanya untuk akun peserta.</p>
          ) : (
            perUserLimit !== null &&
            !overUserLimit && <p className="mt-3 text-sm text-muted">Maksimal {perUserLimit} tiket per akun.</p>
          )}
        </>
      )}
      </div>
    </div>
  );
}

function maxFor(type: TicketType) {
  return Math.min(type.maxPerOrder, type.available);
}

function TicketRow({ type, quantity, onChange }: { type: TicketType; quantity: number; onChange: (delta: number) => void }) {
  const onSale = type.salesStatus === "ON_SALE";
  const lowStock = onSale && type.available <= 5;

  return (
    <li className={cn("flex items-start justify-between gap-4 py-4", type.salesStatus === "SOLD_OUT" && "opacity-50")}>
      <div className="min-w-0">
        <p className="font-semibold">{type.name}</p>
        {type.description && <p className="mt-0.5 text-[14px] text-muted">{type.description}</p>}
        <StatusLine type={type} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="font-semibold tabular-nums">{formatRupiah(type.price)}</p>
        {lowStock && <p className="text-[13px] font-semibold text-brand">Sisa {type.available}</p>}
        {onSale && <Stepper name={type.name} value={quantity} max={maxFor(type)} onChange={onChange} />}
      </div>
    </li>
  );
}

function StatusLine({ type }: { type: TicketType }) {
  if (type.salesStatus === "SOLD_OUT") return <p className="mt-1 text-[14px] font-semibold">Habis</p>;
  if (type.salesStatus === "UPCOMING")
    return <p className="mt-1 text-[14px] text-muted">Dibuka {formatDateTime(type.salesStartAt)}</p>;
  if (type.salesStatus === "ENDED" || type.salesStatus === "PAUSED")
    return <p className="mt-1 text-[14px] text-muted">Penjualan ditutup</p>;
  return null;
}

function Stepper({
  name,
  value,
  max,
  onChange,
}: {
  name: string;
  value: number;
  max: number;
  onChange: (delta: number) => void;
}) {
  const button =
    "flex size-9 items-center justify-center rounded-md border border-navy/30 text-[18px] font-semibold transition-colors hover:border-navy hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Jumlah tiket ${name}`}>
      <button type="button" className={button} onClick={() => onChange(-1)} disabled={value === 0} aria-label={`Kurangi ${name}`}>
        −
      </button>
      <output aria-live="polite" className="w-6 text-center font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(1)} disabled={value >= max} aria-label={`Tambah ${name}`}>
        +
      </button>
    </div>
  );
}
