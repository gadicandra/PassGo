"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { Event } from "@/types/api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { cancelEvent, deleteEvent, newIdempotencyKey, publishEvent } from "@/lib/organizer/api";
import { currentFrom, errorMessage } from "@/lib/organizer/errors";
import { useManagedEvent } from "./EventManage";

type Panel = "cancel" | "delete" | null;

/** Syarat terbit (kontrak §9.5 publish), dihitung di browser supaya organizer tahu yang kurang sebelum menekan tombol. */
function publishRequirements(event: Event) {
  const types = event.ticketTypes ?? [];
  const totalQuota = types.reduce((sum, type) => sum + type.quota, 0);
  return [
    { key: "description", label: "Deskripsi acara diisi", done: event.description.trim().length > 0 },
    { key: "venueAddress", label: "Alamat tempat diisi", done: event.venueAddress.trim().length > 0 },
    { key: "startAt", label: "Jadwal mulai belum lewat", done: Date.parse(event.startAt) > Date.now() },
    { key: "ticketTypes", label: "Minimal satu tipe tiket aktif", done: types.some((type) => type.isActive) },
    ...(event.capacity !== null
      ? [{ key: "capacity", label: `Total kuota tiket (${totalQuota}) tidak melebihi kapasitas (${event.capacity})`, done: totalQuota <= event.capacity }]
      : []),
  ];
}

const publishPointerLabel: Record<string, string> = {
  description: "Deskripsi acara belum diisi.",
  venueAddress: "Alamat tempat belum diisi.",
  startAt: "Jadwal mulai sudah lewat.",
};

export function PublishChecklist() {
  const { event } = useManagedEvent();
  const items = publishRequirements(event);
  const missing = items.filter((item) => !item.done).length;

  return (
    <section aria-labelledby="publish-checklist" className="rounded-card border border-line bg-white px-5 py-4">
      <h2 id="publish-checklist" className="text-[15px] font-semibold">
        {missing === 0 ? "Siap diterbitkan" : `Sebelum terbit: ${missing} hal lagi`}
      </h2>
      <ul className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-[14px] sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
            <span className={item.done ? "text-muted" : "text-navy"}>{item.label}</span>
            <span className={cn("shrink-0 font-semibold", item.done ? "text-teal" : "text-danger")}>{item.done ? "Sudah" : "Belum"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EventActions() {
  const { event, setEvent } = useManagedEvent();
  const router = useRouter();
  const toast = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);

  function openPanel(next: Panel) {
    setPanel(next);
    setError(null);
    setPublishErrors([]);
  }

  function fail(caught: unknown, fallback: string) {
    const current = currentFrom<Event>(caught);
    if (current) setEvent(current);
    setError(errorMessage(caught, fallback));
  }

  async function publish() {
    setBusy(true);
    setError(null);
    setPublishErrors([]);
    try {
      setEvent(await publishEvent(event));
      toast.success("Acara terbit dan sudah tampil di katalog.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "event-not-publishable") {
        const errors = caught.problem.errors ?? [];
        setPublishErrors(
          errors.map((item) => publishPointerLabel[item.pointer?.replace(/^#?\//, "") ?? ""] ?? item.detail),
        );
        setError("Acara belum bisa diterbitkan.");
      } else {
        fail(caught, "Gagal menerbitkan acara.");
      }
    } finally {
      setBusy(false);
    }
  }

  const draft = event.status === "DRAFT";
  const cancellable = event.status === "PUBLISHED" && !event.isEnded;
  if (!draft && !cancellable) return null;

  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
      {panel === null && (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {draft && (
            <>
              <Button variant="text" onClick={() => openPanel("delete")} disabled={busy}>
                Hapus draf
              </Button>
              <Button onClick={publish} loading={busy}>
                Terbitkan
              </Button>
            </>
          )}
          {cancellable && (
            <Button variant="outline" onClick={() => openPanel("cancel")}>
              Batalkan acara
            </Button>
          )}
        </div>
      )}

      {panel === null && error && (
        <div className="sm:max-w-[360px]">
          <FormError>
            {error}
            {publishErrors.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {publishErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </FormError>
        </div>
      )}

      {panel === "delete" && (
        <DeletePanel
          onClose={() => setPanel(null)}
          onConfirm={async () => {
            try {
              await deleteEvent(event);
              toast.success("Draf dihapus.");
              router.push("/organizer/events");
            } catch (caught) {
              fail(caught, "Gagal menghapus draf.");
              throw caught;
            }
          }}
          error={error}
        />
      )}

      {panel === "cancel" && <CancelPanel onClose={() => setPanel(null)} />}
    </div>
  );
}

function DeletePanel({ onClose, onConfirm, error }: { onClose: () => void; onConfirm: () => Promise<void>; error: string | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <div role="group" aria-label="Hapus draf" className="w-full rounded-card border border-line bg-white p-5 sm:w-[380px]">
      <p className="font-semibold">Hapus draf ini?</p>
      <p className="mt-1 text-[14px] text-muted">Acara, tipe tiket, dan posternya ikut terhapus. Tidak bisa dikembalikan.</p>
      <div className="mt-3">
        <FormError>{error}</FormError>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="dark"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm().catch(() => setBusy(false));
          }}
        >
          Hapus draf
        </Button>
        <Button variant="text" onClick={onClose} disabled={busy}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function CancelPanel({ onClose }: { onClose: () => void }) {
  const { event, setEvent } = useManagedEvent();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  // Satu key per dialog: kalau jaringan putus lalu "Batalkan acara" ditekan lagi, server tidak memproses dua kali.
  const [idempotencyKey] = useState(newIdempotencyKey);

  async function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      setFieldError("Alasan 5–500 karakter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await cancelEvent(event, trimmed, idempotencyKey);
      setEvent(result.event);
      const { pendingOrdersCancelled, paidOrdersRequiringRefund, ticketsVoided } = result.affected;
      toast.success(
        `Acara dibatalkan. ${ticketsVoided} tiket tidak berlaku, ${pendingOrdersCancelled} pesanan menunggu dibatalkan, ${paidOrdersRequiringRefund} pesanan perlu refund.`,
      );
      onClose();
    } catch (caught) {
      const current = currentFrom<Event>(caught);
      if (current) setEvent(current);
      setError(errorMessage(caught, "Gagal membatalkan acara."));
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label="Batalkan acara" className="w-full rounded-card border border-line bg-white p-5 sm:w-[420px]">
      <p className="font-semibold">Batalkan acara ini?</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-muted">
        <li>Penjualan dan check-in langsung ditutup.</li>
        <li>Pesanan yang belum dibayar dibatalkan.</li>
        <li>Semua tiket jadi tidak berlaku, termasuk yang sudah check-in.</li>
        <li>Pesanan lunas berbayar ditandai perlu refund di halaman Pesanan.</li>
        <li>Pembeli menerima email pembatalan. Tidak bisa dikembalikan.</li>
      </ul>
      <TextArea
        name="cancelReason"
        label="Alasan (dikirim ke pembeli)"
        rows={3}
        maxLength={500}
        className="mt-4"
        value={reason}
        error={fieldError}
        onChange={(changeEvent) => {
          setReason(changeEvent.target.value);
          setFieldError(undefined);
        }}
      />
      <div className="mt-3">
        <FormError>{error}</FormError>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="dark" loading={busy} onClick={submit}>
          Batalkan acara
        </Button>
        <Button variant="text" onClick={onClose} disabled={busy}>
          Kembali
        </Button>
      </div>
    </div>
  );
}
