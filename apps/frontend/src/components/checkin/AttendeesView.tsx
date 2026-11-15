"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Attendee, TicketType } from "@/types/api";
import { AccessDenied, GateSkeleton } from "@/components/ticket/AccessDenied";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/api/auth";
import { ApiError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { ticketStatusLabel, toneClass } from "@/lib/status";
import {
  downloadAttendees,
  findRevertibleCheckIn,
  listAttendees,
  reissueTicket,
  revertCheckIn,
} from "@/lib/tickets/api";
import { submitCheckIn } from "@/lib/tickets/checkin";
import { errorMessage } from "@/lib/tickets/errors";
import { eventLinks } from "@/lib/tickets/links";
import type { AttendeePage } from "@/lib/tickets/types";
import { useRoleGate } from "@/lib/tickets/useRoleGate";
import { AttendeeActionPanel, type ActionKind } from "./AttendeeActionPanel";
import { EventHeader, useEvent } from "./EventHeader";

const ROLES = ["STAFF", "ORGANIZER"] as const;

const statusOptions = [
  { value: "VALID,CHECKED_IN", label: "Semua yang berlaku" },
  { value: "VALID", label: "Belum masuk" },
  { value: "CHECKED_IN", label: "Sudah masuk" },
  { value: "VOID", label: "Tidak berlaku" },
];
const sortOptions = [
  { value: "holderName", label: "Nama A–Z" },
  { value: "-checkedInAt", label: "Check-in terbaru" },
  { value: "checkedInAt", label: "Check-in terlama" },
  { value: "ticketTypeName", label: "Tipe tiket" },
];

const rowGrid = "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_150px_160px_minmax(0,1.2fr)]";

interface Loaded {
  key: string;
  page: AttendeePage | null;
  error: string | null;
}

export function AttendeesView({ eventId }: { eventId: string }) {
  const gate = useRoleGate(ROLES);
  const { user } = useAuth();
  const toast = useToast();
  const allowed = gate === "allowed";
  const organizer = user?.role === "ORGANIZER";
  const { event, error: eventError } = useEvent(eventId, allowed);
  const timezone = event?.timezone ?? "Asia/Jakarta";

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(statusOptions[0].value);
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [sort, setSort] = useState("holderName");
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ ticketId: string; kind: ActionKind } | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const key = JSON.stringify([q, status, ticketTypeId, sort, page, reloads]);
  const reload = useCallback(() => setReloads((count) => count + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      setQ(next.length >= 2 ? next : "");
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!allowed) return;
    apiFetch<TicketType[]>(`/events/${eventId}/ticket-types`).then(setTypes).catch(() => undefined);
  }, [allowed, eventId]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    listAttendees(eventId, { status, ticketTypeId: ticketTypeId || undefined, q: q || undefined, sort, page })
      .then((result) => active && setLoaded({ key, page: result, error: null }))
      .catch((caught) => active && setLoaded((previous) => ({ key, page: previous?.page ?? null, error: errorMessage(caught, "Gagal memuat peserta.") })));
    return () => {
      active = false;
    };
  }, [allowed, eventId, status, ticketTypeId, q, sort, page, key]);

  if (gate === "checking") return <GateSkeleton />;
  if (gate === "denied") return <AccessDenied message="Halaman ini untuk panitia dan penyelenggara." />;

  const links = eventLinks(user?.role, eventId);
  const back = organizer ? { href: "/organizer/events", label: "Semua acara" } : { href: "/staff", label: "Acara saya" };
  const loading = loaded?.key !== key;
  const data = loaded?.page ?? null;
  const cancelled = event?.status === "CANCELLED";

  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
    setPanel(null);
  }

  async function manualCheckIn(attendee: Attendee) {
    if (!user) return;
    setBusyId(attendee.ticketId);
    try {
      const outcome = await submitCheckIn(eventId, { ticketId: attendee.ticketId }, { selfId: user.id, timezone });
      if (outcome.kind === "success") toast.success(`${attendee.holderName} tercatat masuk.`);
      else toast.error(`${outcome.title}. ${outcome.detail}`);
      reload();
    } catch (caught) {
      toast.error(errorMessage(caught, "Check-in gagal. Coba lagi."));
    } finally {
      setBusyId(null);
    }
  }

  async function runPanel(attendee: Attendee, kind: ActionKind, reason: string) {
    try {
      if (kind === "revert") {
        const checkIn = await findRevertibleCheckIn(eventId, attendee.ticketId);
        if (!checkIn) throw new Error("Check-in untuk tiket ini tidak ditemukan atau sudah dibatalkan.");
        await revertCheckIn(eventId, checkIn.id, reason);
        toast.success(`Check-in ${attendee.holderName} dibatalkan.`);
      } else {
        if (attendee.version === null) throw new Error("Versi tiket tidak tersedia. Muat ulang halaman.");
        await reissueTicket(attendee.ticketId, attendee.version, reason);
        toast.success("Kode tiket baru diterbitkan dan dikirim ke pembeli.");
      }
      setPanel(null);
      reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 412) {
        reload();
        throw new Error("Data tiket sudah berubah. Daftar dimuat ulang, coba lagi.");
      }
      throw caught instanceof Error ? new Error(errorMessage(caught, caught.message)) : caught;
    }
  }

  async function exportFile(format: "csv" | "xlsx") {
    setExporting(format);
    try {
      const filename = await downloadAttendees(eventId, format);
      toast.success(`Berkas ${filename} diunduh.`);
    } catch (caught) {
      toast.error(errorMessage(caught, "Gagal mengunduh daftar peserta."));
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <Link href={back.href} className="text-[15px] font-semibold text-muted hover:text-navy">
        {back.label}
      </Link>
      <div className="mt-3">
        <EventHeader event={event} error={eventError} title="Peserta" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!cancelled && <ButtonLink href={links.scan}>Pindai tiket</ButtonLink>}
        <ButtonLink href={links.attendance} variant="outline">
          Laporan kehadiran
        </ButtonLink>
        {organizer && (
          <>
            <Button variant="outline" loading={exporting === "csv"} disabled={exporting !== null} onClick={() => exportFile("csv")}>
              Unduh CSV
            </Button>
            <Button variant="outline" loading={exporting === "xlsx"} disabled={exporting !== null} onClick={() => exportFile("xlsx")}>
              Unduh XLSX
            </Button>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <Field
          name="search"
          type="search"
          label="Cari peserta"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nama, email pembeli, atau 4 karakter akhir kode"
          error={search.trim().length === 1 ? "Ketik minimal 2 huruf untuk mencari." : undefined}
          autoComplete="off"
        />
        <Select name="status" label="Status" value={status} onChange={(event) => changeFilter(() => setStatus(event.target.value))}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select name="ticketType" label="Tipe tiket" value={ticketTypeId} onChange={(event) => changeFilter(() => setTicketTypeId(event.target.value))}>
          <option value="">Semua tipe</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
        <Select name="sort" label="Urutkan" value={sort} onChange={(event) => changeFilter(() => setSort(event.target.value))}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {data && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-1 text-[15px]" aria-label="Jumlah tiket">
          <div className="flex gap-2">
            <dt className="text-muted">Belum masuk</dt>
            <dd className="font-semibold tabular-nums">{data.meta.counts.valid}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Sudah masuk</dt>
            <dd className="font-semibold tabular-nums text-teal">{data.meta.counts.checkedIn}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Tidak berlaku</dt>
            <dd className="font-semibold tabular-nums">{data.meta.counts.void}</dd>
          </div>
        </dl>
      )}

      {!data && loading && (
        <div className="mt-6 flex flex-col gap-2" aria-busy aria-label="Memuat peserta">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!data && !loading && loaded?.error && (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p className="text-danger" role="alert">{loaded.error}</p>
          <Button variant="dark" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      )}

      {data && loaded?.error && (
        <p className="mt-4 text-danger" role="alert">{loaded.error}</p>
      )}

      {data && data.data.length === 0 && (
        <p className="mt-8 text-[18px] font-semibold">{q ? `Tidak ada peserta yang cocok dengan “${q}”.` : "Belum ada peserta dengan filter ini."}</p>
      )}

      {data && data.data.length > 0 && (
        <div className={cn("mt-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <div className={cn("hidden border-b border-navy px-4 pb-2 text-[13px] font-semibold text-muted md:grid md:gap-4", rowGrid)}>
            <span>Pemegang tiket</span>
            <span>Tipe</span>
            <span>Kode</span>
            <span>Status</span>
            <span className="text-right">Aksi</span>
          </div>
          <ul className="divide-y divide-line border-b border-line md:border-t-0">
            {data.data.map((attendee) => {
              const label = ticketStatusLabel[attendee.status];
              const open = panel?.ticketId === attendee.ticketId ? panel.kind : null;
              return (
                <li key={attendee.ticketId}>
                  <div className={cn("grid gap-x-4 gap-y-1 px-4 py-3 md:items-center", rowGrid)}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{attendee.holderName}</p>
                      <p className="truncate text-[13px] text-muted">
                        Pembeli: {attendee.buyerName}
                        {attendee.buyerEmail ? ` · ${attendee.buyerEmail}` : ""}
                      </p>
                    </div>
                    <p className="text-[14px]">{attendee.ticketTypeName}</p>
                    <p className="font-mono text-[13px] text-muted">{attendee.codeMasked}</p>
                    <p className={cn("text-[14px] font-semibold", toneClass[label.tone])}>
                      {label.label}
                      {attendee.status === "CHECKED_IN" && attendee.checkedInAt && (
                        <span className="block text-[12px] font-normal text-muted">
                          {formatTime(attendee.checkedInAt, timezone)}
                          {attendee.checkedInBy ? ` · ${attendee.checkedInBy.name}` : ""}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
                      {attendee.status === "VALID" && !cancelled && (
                        <Button variant="dark" size="sm" loading={busyId === attendee.ticketId} onClick={() => manualCheckIn(attendee)}>
                          Check-in
                        </Button>
                      )}
                      {organizer && attendee.status === "CHECKED_IN" && (
                        <Button variant="text" className="text-[14px]" onClick={() => setPanel(open === "revert" ? null : { ticketId: attendee.ticketId, kind: "revert" })}>
                          Batalkan check-in
                        </Button>
                      )}
                      {organizer && attendee.status === "VALID" && (
                        <Button variant="text" className="text-[14px]" onClick={() => setPanel(open === "reissue" ? null : { ticketId: attendee.ticketId, kind: "reissue" })}>
                          Terbitkan ulang kode
                        </Button>
                      )}
                    </div>
                  </div>
                  {open && (
                    <AttendeeActionPanel
                      kind={open}
                      holderName={attendee.holderName}
                      onSubmit={(reason) => runPanel(attendee, open, reason)}
                      onCancel={() => setPanel(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <nav aria-label="Halaman daftar peserta" className="mt-6 flex flex-wrap items-center gap-4">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
              Sebelumnya
            </Button>
            <p className="text-[14px] text-muted" aria-live="polite">
              Halaman {data.meta.page} dari {Math.max(1, data.meta.totalPages)} · {data.meta.totalItems} peserta
            </p>
            <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages || loading} onClick={() => setPage((current) => current + 1)}>
              Berikutnya
            </Button>
          </nav>
        </div>
      )}
    </>
  );
}
