"use client";

import { useEffect, useRef, useState } from "react";
import { useManagedEvent } from "@/components/organizer/EventManage";
import { TicketTypeForm } from "@/components/organizer/TicketTypeForm";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Event, TicketType } from "@/types/api";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah, formatTime } from "@/lib/format";
import { toneClass } from "@/lib/status";
import { createTicketType, deleteTicketType, isEditable, updateTicketType, type TicketTypeBody } from "@/lib/organizer/api";
import { currentFrom, errorMessage } from "@/lib/organizer/errors";
import { ticketSalesLabel } from "@/lib/organizer/labels";

type Editing = { kind: "new" } | { kind: "edit"; id: string } | null;

function withType(event: Event, type: TicketType): Event {
  const types = event.ticketTypes ?? [];
  const exists = types.some((item) => item.id === type.id);
  const next = exists ? types.map((item) => (item.id === type.id ? type : item)) : [...types, type];
  return { ...event, ticketTypes: next.sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price) };
}

export function TicketTypes() {
  const { event, setEvent, reload } = useManagedEvent();
  const toast = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const panel = useRef<HTMLDivElement>(null);
  const editable = isEditable(event);
  const types = event.ticketTypes ?? [];
  const editingType = editing?.kind === "edit" ? types.find((type) => type.id === editing.id) ?? null : null;
  const totalQuota = types.reduce((sum, type) => sum + type.quota, 0);

  // Di layar sempit form ada di atas daftar; gulir ke sana saat dibuka.
  useEffect(() => {
    if (editing && window.matchMedia("(max-width: 1023px)").matches) {
      panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing]);

  /** Simpan respons ke state, lalu ambil ulang acara supaya priceFrom/salesStatus/checklist ikut segar. */
  function applied(type: TicketType) {
    setEvent(withType(event, type));
    void reload();
  }

  function handleConflict(error: unknown) {
    const current = currentFrom<TicketType>(error);
    if (current) setEvent(withType(event, current));
  }

  async function save(body: Partial<TicketTypeBody>) {
    try {
      if (editingType) {
        applied(await updateTicketType(editingType, body));
        toast.success("Tipe tiket tersimpan.");
      } else {
        applied(await createTicketType(event.id, body as TicketTypeBody));
        toast.success("Tipe tiket ditambahkan.");
      }
      setEditing(null);
    } catch (error) {
      // 412: form dimuat ulang dari versi terbaru (key memuat version), pesan lewat toast.
      if (!currentFrom<TicketType>(error)) throw error;
      handleConflict(error);
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <section className={cn("min-w-0", editing ? "lg:col-span-7" : "lg:col-span-12")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold">Tipe tiket</h2>
            <p className="mt-1 text-[14px] text-muted tabular-nums">
              Total kuota {totalQuota}
              {event.capacity !== null && ` dari kapasitas ${event.capacity}`}
            </p>
          </div>
          {editable && editing?.kind !== "new" && (
            <Button variant="dark" onClick={() => setEditing({ kind: "new" })}>
              Tambah tipe tiket
            </Button>
          )}
        </div>

        {types.length === 0 ? (
          <div className="mt-6 border-t border-line py-10">
            <p className="font-semibold">Belum ada tipe tiket</p>
            <p className="mt-1 text-muted">Acara butuh minimal satu tipe tiket aktif sebelum bisa diterbitkan.</p>
          </div>
        ) : (
          <ul className="mt-6 border-t border-line">
            {types.map((type) => (
              <TicketTypeRow
                key={type.id}
                type={type}
                timeZone={event.timezone}
                editable={editable}
                selected={editing?.kind === "edit" && editing.id === type.id}
                onEdit={() => setEditing({ kind: "edit", id: type.id })}
                onToggle={async () => {
                  try {
                    applied(await updateTicketType(type, { isActive: !type.isActive }));
                    toast.success(type.isActive ? `${type.name} dinonaktifkan.` : `${type.name} diaktifkan.`);
                  } catch (error) {
                    handleConflict(error);
                    toast.error(errorMessage(error, "Gagal mengubah status."));
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteTicketType(type);
                    setEvent({ ...event, ticketTypes: types.filter((item) => item.id !== type.id) });
                    if (editing?.kind === "edit" && editing.id === type.id) setEditing(null);
                    void reload();
                    toast.success(`${type.name} dihapus.`);
                  } catch (error) {
                    handleConflict(error);
                    toast.error(errorMessage(error, "Gagal menghapus tipe tiket."));
                  }
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {editing && editable && (
        <div ref={panel} className="order-first scroll-mt-24 lg:order-last lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <TicketTypeForm
              key={editing.kind === "edit" ? `${editing.id}-${editingType?.version}` : "new"}
              event={event}
              type={editingType}
              onSave={save}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TicketTypeRow({
  type,
  timeZone,
  editable,
  selected,
  onEdit,
  onToggle,
  onDelete,
}: {
  type: TicketType;
  timeZone: string;
  editable: boolean;
  selected: boolean;
  onEdit: () => void;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sold = type.soldCount ?? 0;
  const reserved = type.reservedCount ?? 0;
  // Backend juga menolak tipe yang pernah ada di pesanan; ini hanya menyembunyikan tombol yang pasti gagal.
  const deletable = sold === 0 && reserved === 0;
  const status = ticketSalesLabel[type.salesStatus] ?? { label: type.salesStatus, tone: "muted" as const };

  const run = (kind: "toggle" | "delete", action: () => Promise<void>) => async () => {
    setBusy(kind);
    await action();
    setBusy(null);
    setConfirmDelete(false);
  };

  return (
    <li className={cn("border-b border-line py-4", selected && "bg-sun/15", !type.isActive && "text-navy/70")}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-[16px] font-semibold">{type.name}</span>
            <span className={cn("text-[14px] font-semibold", toneClass[status.tone])}>{status.label}</span>
          </p>
          {type.description && <p className="mt-0.5 text-[14px] text-muted">{type.description}</p>}
          <p className="mt-1 text-[14px] text-muted">
            Dijual {formatDate(type.salesStartAt, timeZone)} {formatTime(type.salesStartAt, timeZone)} – {formatDate(type.salesEndAt, timeZone)}{" "}
            {formatTime(type.salesEndAt, timeZone)}, maks. {type.maxPerOrder} tiket per pesanan
          </p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-[14px] tabular-nums sm:grid-cols-[repeat(3,auto)] sm:text-right">
          <div className="contents sm:block">
            <dt className="text-muted">Harga</dt>
            <dd className="font-semibold">{formatRupiah(type.price)}</dd>
          </div>
          <div className="contents sm:block">
            <dt className="text-muted">Terjual</dt>
            <dd>
              <span className="font-semibold">{sold}</span> / {type.quota}
            </dd>
          </div>
          <div className="contents sm:block">
            <dt className="text-muted">Sisa</dt>
            <dd>
              {type.available}
              {reserved > 0 && <span className="text-muted"> ({reserved} dipesan)</span>}
            </dd>
          </div>
        </dl>
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-semibold">
          {confirmDelete ? (
            <>
              <span className="font-normal">Hapus {type.name}?</span>
              <Button variant="dark" size="sm" loading={busy === "delete"} onClick={run("delete", onDelete)}>
                Hapus
              </Button>
              <button type="button" className="underline-offset-4 hover:underline" onClick={() => setConfirmDelete(false)} disabled={busy !== null}>
                Batal
              </button>
            </>
          ) : (
            <>
              <button type="button" className="underline underline-offset-4 hover:text-brand" onClick={onEdit} disabled={busy !== null}>
                Ubah
              </button>
              <button
                type="button"
                className="underline underline-offset-4 hover:text-brand disabled:opacity-50"
                onClick={run("toggle", onToggle)}
                disabled={busy !== null}
                aria-busy={busy === "toggle" || undefined}
              >
                {busy === "toggle" ? "Menyimpan…" : type.isActive ? "Nonaktifkan" : "Aktifkan"}
              </button>
              {deletable && (
                <button
                  type="button"
                  className="text-danger underline underline-offset-4 disabled:opacity-50"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy !== null}
                >
                  Hapus
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
