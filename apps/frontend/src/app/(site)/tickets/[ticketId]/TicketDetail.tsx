"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Ticket, VoidReason } from "@/types/api";
import { Perforation } from "@/components/event/TicketStub";
import { AccessDenied, GateSkeleton } from "@/components/ticket/AccessDenied";
import { TicketQr } from "@/components/ticket/TicketQr";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { ticketStatusLabel, toneClass } from "@/lib/status";
import { getTicket, renameTicket } from "@/lib/tickets/api";
import { errorMessage, validationMessage } from "@/lib/tickets/errors";
import { useRoleGate } from "@/lib/tickets/useRoleGate";

const ROLES = ["ATTENDEE"] as const;

const voidReasonText: Record<VoidReason, string> = {
  EVENT_CANCELLED: "Acara dibatalkan oleh penyelenggara.",
  ORDER_REFUNDED: "Pesanan tiket ini sudah di-refund.",
};

function validateName(value: string): string | undefined {
  const name = value.trim();
  if (name.length < 2) return "Nama minimal 2 karakter.";
  if (name.length > 100) return "Nama maksimal 100 karakter.";
  return undefined;
}

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const gate = useRoleGate(ROLES);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowed = gate === "allowed";

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    getTicket(ticketId)
      .then((loaded) => active && setTicket(loaded))
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof ApiError && caught.status === 404 ? "Tiket tidak ditemukan." : errorMessage(caught, "Gagal memuat tiket."));
      });
    return () => {
      active = false;
    };
  }, [allowed, ticketId]);

  if (gate === "checking") return <GateSkeleton />;
  if (gate === "denied") return <AccessDenied message="Tiket hanya untuk akun peserta." />;
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[18px] font-semibold" role="alert">{error}</p>
        <Link href="/tickets" className="font-semibold text-brand underline-offset-4 hover:underline">
          Kembali ke tiket saya
        </Link>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="grid gap-8 md:grid-cols-[400px_1fr]" aria-busy aria-label="Memuat tiket">
        <Skeleton className="h-[520px] rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  return (
    <>
      <Link href="/tickets" className="text-[15px] font-semibold text-muted hover:text-navy">
        Semua tiket
      </Link>
      <h1 className="mt-3 font-display text-[36px] font-extrabold leading-none tracking-[-0.01em] md:text-[48px]">{ticket.event.title}</h1>
      <p className="mt-3 text-muted">
        {formatDateTime(ticket.event.startAt, ticket.event.timezone)} · {ticket.event.venueName}
      </p>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[400px_1fr]">
        <QrPanel ticket={ticket} />
        <div className="flex flex-col gap-8">
          <HolderForm ticket={ticket} onUpdated={setTicket} />
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[15px]">
            <dt className="text-muted">Tipe tiket</dt>
            <dd className="font-semibold">{ticket.ticketTypeName}</dd>
            <dt className="text-muted">Pesanan</dt>
            <dd>
              <Link href={`/orders/${ticket.orderId}`} className="font-mono text-[14px] hover:text-brand">
                {ticket.orderNumber}
              </Link>
            </dd>
            <dt className="text-muted">Lokasi</dt>
            <dd>{ticket.event.venueName}</dd>
          </dl>
        </div>
      </div>
    </>
  );
}

function QrPanel({ ticket }: { ticket: Ticket }) {
  const toast = useToast();
  const status = ticketStatusLabel[ticket.status];

  async function copyCode() {
    if (!ticket.code) return;
    try {
      await navigator.clipboard.writeText(ticket.code);
      toast.success("Kode tiket disalin.");
    } catch {
      toast.error("Kode tidak bisa disalin. Salin manual dari layar.");
    }
  }

  return (
    <div className="overflow-hidden rounded-card border-2 border-navy bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{ticket.holderName}</p>
        <p className={cn("text-[15px] font-semibold", toneClass[status.tone])}>{status.label}</p>
      </div>
      <p className="text-[14px] text-muted">{ticket.ticketTypeName}</p>
      <Perforation className="-mx-5" />

      {ticket.status === "VOID" ? (
        <div className="flex flex-col gap-2 py-6" role="status">
          <p className="text-[20px] font-semibold text-danger">Tiket ini tidak berlaku</p>
          <p className="text-muted">{ticket.voidReason ? voidReasonText[ticket.voidReason] : "Tiket sudah dibatalkan."}</p>
          {ticket.voidedAt && <p className="text-[14px] text-muted">Dibatalkan {formatDateTime(ticket.voidedAt, ticket.event.timezone)}</p>}
        </div>
      ) : (
        ticket.qrPayload &&
        ticket.code && (
          <div className="flex flex-col items-center gap-4 pb-1 pt-2">
            <div className="relative w-full max-w-[320px]">
              <TicketQr payload={ticket.qrPayload} dimmed={ticket.status === "CHECKED_IN"} />
              {ticket.status === "CHECKED_IN" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center" role="status">
                  <p className="text-[22px] font-semibold text-teal">Sudah masuk</p>
                  {ticket.checkedInAt && <p className="text-[14px] text-navy">{formatDateTime(ticket.checkedInAt, ticket.event.timezone)}</p>}
                </div>
              )}
            </div>
            <p className="font-mono text-[17px] tracking-wide">{ticket.code}</p>
            <div className="flex w-full flex-col gap-2 text-center">
              <Button variant="outline" size="sm" onClick={copyCode}>
                Salin kode
              </Button>
              {ticket.status === "VALID" && <p className="text-[13px] text-muted">Tunjukkan QR ini ke panitia di pintu masuk. Kode di atas bisa diketik kalau QR tidak terbaca.</p>}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function HolderForm({ ticket, onUpdated }: { ticket: Ticket; onUpdated: (ticket: Ticket) => void }) {
  const toast = useToast();
  const [name, setName] = useState(ticket.holderName);
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (ticket.status !== "VALID" || !ticket.holderNameEditable) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[14px] font-semibold text-muted">Nama pemegang tiket</p>
        <p className="text-[20px] font-semibold">{ticket.holderName}</p>
        {ticket.status === "VALID" && <p className="text-[14px] text-muted">Nama tidak bisa diubah lagi karena check-in sudah dibuka.</p>}
      </div>
    );
  }

  const unchanged = name.trim() === ticket.holderName;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateName(name);
    setFieldError(problem);
    setFormError(undefined);
    if (problem) return;
    setSaving(true);
    try {
      const updated = await renameTicket(ticket.id, ticket.version, name.trim());
      onUpdated(updated);
      setName(updated.holderName);
      toast.success("Nama pemegang tiket diperbarui.");
    } catch (caught) {
      const validation = validationMessage(caught);
      if (validation) setFieldError(validation);
      else if (caught instanceof ApiError && caught.code === "holder-name-locked") {
        toast.info("Nama sudah tidak bisa diubah.");
        onUpdated({ ...ticket, holderNameEditable: false });
      } else if (caught instanceof ApiError && caught.status === 412) {
        onUpdated(await getTicket(ticket.id).catch(() => ticket));
        setFormError("Data tiket sudah berubah. Periksa nama lalu simpan lagi.");
      } else setFormError(errorMessage(caught, "Gagal menyimpan nama."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-4">
      <Field
        name="holderName"
        label="Nama pemegang tiket"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (fieldError) setFieldError(validateName(event.target.value));
        }}
        onBlur={() => setFieldError(validateName(name))}
        error={fieldError}
        hint="Dipakai panitia untuk mencocokkan daftar hadir. Beli tiket untuk teman? Isi namanya di sini."
        autoComplete="name"
        maxLength={100}
        required
      />
      <FormError>{formError}</FormError>
      <div>
        <Button type="submit" loading={saving} disabled={unchanged}>
          Simpan nama
        </Button>
      </div>
    </form>
  );
}
