"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { getAttendanceReport } from "@/lib/tickets/api";
import { MAX_CODE_LENGTH, parseManualCode } from "@/lib/tickets/code";
import { resultLabel, submitCheckIn, unknownCodeOutcome, type OutcomeKind, type ScanOutcome } from "@/lib/tickets/checkin";
import { errorMessage } from "@/lib/tickets/errors";
import { eventLinks } from "@/lib/tickets/links";
import type { AttendanceReport } from "@/lib/tickets/types";
import { useRoleGate } from "@/lib/tickets/useRoleGate";
import { EventHeaderInline } from "./EventHeaderInline";
import { QrCamera } from "./QrCamera";
import { useEvent } from "./EventHeader";

const ROLES = ["STAFF", "ORGANIZER"] as const;
const DUPLICATE_MS = 3000;
const SUCCESS_VISIBLE_MS = 3500;
const COUNT_POLL_MS = 10_000;

const panelClass: Record<OutcomeKind, string> = {
  success: "bg-teal text-cream",
  warning: "bg-sun text-navy",
  error: "bg-danger text-white",
};

interface HistoryItem {
  id: number;
  outcome: ScanOutcome;
}

export function ScannerScreen({ eventId }: { eventId: string }) {
  const gate = useRoleGate(ROLES);
  const { user } = useAuth();
  const allowed = gate === "allowed";
  const { event, error: eventError } = useEvent(eventId, allowed);
  const timezone = event?.timezone ?? "Asia/Jakarta";

  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState<string>();
  const lastScan = useRef<{ text: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const loadCounts = useCallback(() => {
    getAttendanceReport(eventId)
      .then(setReport)
      .catch(() => undefined);
  }, [eventId]);

  useEffect(() => {
    if (!allowed) return;
    loadCounts();
    const timer = setInterval(loadCounts, COUNT_POLL_MS);
    return () => clearInterval(timer);
  }, [allowed, loadCounts]);

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  const show = useCallback(
    (next: ScanOutcome) => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setOutcome(next);
      setHistory((current) => [{ id: ++counter.current, outcome: next }, ...current].slice(0, 8));
      navigator.vibrate?.(next.kind === "success" ? 80 : [120, 60, 120]);
      if (next.kind === "success") {
        loadCounts();
        clearTimer.current = setTimeout(() => setOutcome(null), SUCCESS_VISIBLE_MS);
      }
    },
    [loadCounts],
  );

  const run = useCallback(
    async (target: { code: string }) => {
      if (!user || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        show(await submitCheckIn(eventId, target, { selfId: user.id, timezone }));
      } catch (caught) {
        const notAssigned = caught instanceof ApiError && caught.status === 404;
        show({
          result: "NOT_FOUND",
          kind: "error",
          title: notAssigned ? "Acara tidak bisa diakses" : "Check-in belum terkirim",
          detail: notAssigned ? "Kamu tidak ditugaskan di acara ini." : errorMessage(caught, "Periksa koneksi lalu pindai lagi."),
          holderName: null,
          ticketTypeName: null,
          at: new Date(),
        });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [eventId, show, timezone, user],
  );

  const handleDecode = useCallback(
    (text: string) => {
      const now = Date.now();
      if (busyRef.current || (lastScan.current && lastScan.current.text === text && now - lastScan.current.at < DUPLICATE_MS)) return;
      lastScan.current = { text, at: now };
      if (text.length > MAX_CODE_LENGTH) {
        show(unknownCodeOutcome());
        return;
      }
      void run({ code: text });
    },
    [run, show],
  );

  async function submitManual(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const parsed = parseManualCode(manual);
    if (!parsed.ok) {
      setManualError(parsed.message);
      return;
    }
    setManualError(undefined);
    lastScan.current = null;
    await run({ code: parsed.code });
    setManual("");
  }

  if (gate === "checking") return <Shell><p className="text-cream/70" aria-busy>Memeriksa akses…</p></Shell>;
  if (gate === "denied") {
    return (
      <Shell>
        <p className="text-[18px] font-semibold">Pemindai hanya untuk panitia dan penyelenggara.</p>
        <Link href="/" className="mt-3 inline-block font-semibold text-sun underline-offset-4 hover:underline">
          Ke beranda
        </Link>
      </Shell>
    );
  }

  const links = eventLinks(user?.role, eventId);
  const issued = report ? report.ticketsValid + report.ticketsCheckedIn : null;
  const cancelled = event?.status === "CANCELLED";

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={user?.role === "ORGANIZER" ? "/organizer/events" : "/staff"} className="text-[14px] font-semibold text-cream/70 hover:text-cream">
            Kembali
          </Link>
          <EventHeaderInline event={event} error={eventError} />
        </div>
        <div className="ml-auto text-right" aria-live="polite">
          <p className="text-[44px] font-semibold leading-none tabular-nums text-sun">{report ? report.ticketsCheckedIn : "–"}</p>
          <p className="text-[14px] text-cream/70">{issued !== null ? `dari ${issued} tiket masuk` : "memuat jumlah…"}</p>
        </div>
      </div>

      {cancelled && <p className="mt-4 rounded-md bg-danger px-4 py-3 font-semibold text-white" role="alert">Acara ini dibatalkan. Check-in ditutup.</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-4">
          <QrCamera onDecode={handleDecode} paused={busy || cancelled === true} className="mx-auto max-w-[560px]" />
          <ResultPanel outcome={outcome} busy={busy} timezone={timezone} onDismiss={() => setOutcome(null)} />
        </div>

        <div className="flex flex-col gap-8">
          <form onSubmit={submitManual} noValidate className="flex flex-col gap-3">
            <Field
              name="manualCode"
              label="Kode tiket manual"
              value={manual}
              onChange={(event) => {
                setManual(event.target.value);
                if (manualError) setManualError(undefined);
              }}
              error={manualError}
              hint="Dari tiket peserta, 16 karakter. Huruf kecil dan tanda hubung boleh."
              placeholder="7K2M-9XDQ-4R8B-3N5P"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={cancelled}
              className="[&_input]:font-mono [&_input]:uppercase [&_input:disabled]:bg-cream/80 [&_label]:text-cream [&_p]:text-cream/70 [&_p[role=alert]]:text-[#ff9b8a]"
            />
            <div>
              <Button type="submit" loading={busy} disabled={cancelled}>
                Check-in
              </Button>
            </div>
          </form>

          <section aria-label="Riwayat pindaian">
            <h2 className="text-[18px] font-semibold">Pindaian terakhir</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-[14px] text-cream/60">Belum ada pindaian di sesi ini.</p>
            ) : (
              <ul className="mt-2 divide-y divide-cream/15 border-y border-cream/15">
                {history.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 py-2 text-[14px]">
                    <span className="min-w-0 truncate">
                      {item.outcome.holderName ?? item.outcome.title}
                      {item.outcome.ticketTypeName && <span className="text-cream/60"> · {item.outcome.ticketTypeName}</span>}
                    </span>
                    <span className={cn("shrink-0 font-semibold", item.outcome.kind === "success" ? "text-sun" : item.outcome.kind === "warning" ? "text-cream" : "text-[#ff9b8a]")}>
                      {resultLabel[item.outcome.result]} <span className="font-normal text-cream/50">{formatTime(item.outcome.at.toISOString(), timezone)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex gap-6 text-[14px]">
            <Link href={links.attendees} className="font-semibold text-cream/80 hover:text-cream">
              Daftar peserta
            </Link>
            <Link href={links.attendance} className="font-semibold text-cream/80 hover:text-cream">
              Laporan kehadiran
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-navy text-cream">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-10">{children}</div>
    </main>
  );
}

function ResultPanel({ outcome, busy, timezone, onDismiss }: { outcome: ScanOutcome | null; busy: boolean; timezone: string; onDismiss: () => void }) {
  if (busy) {
    return (
      <div className="rounded-card border-2 border-cream/20 px-5 py-6 text-center text-cream/80" role="status">
        Memeriksa tiket…
      </div>
    );
  }
  if (!outcome) {
    return (
      <div className="rounded-card border-2 border-dashed border-cream/20 px-5 py-6 text-center text-cream/70" role="status">
        Arahkan kamera ke QR tiket.
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-2 rounded-card px-5 py-5", panelClass[outcome.kind])} role={outcome.kind === "success" ? "status" : "alert"}>
      <p className="text-[28px] font-bold leading-tight">{outcome.title}</p>
      {outcome.holderName && (
        <p className="text-[22px] font-semibold leading-tight">
          {outcome.holderName}
          {outcome.ticketTypeName && <span className="font-normal opacity-80"> · {outcome.ticketTypeName}</span>}
        </p>
      )}
      <p className="text-[16px] opacity-90">{outcome.detail}</p>
      <div className="mt-1 flex items-center justify-between gap-3 text-[13px] opacity-80">
        <span>{formatTime(outcome.at.toISOString(), timezone)}</span>
        <button type="button" onClick={onDismiss} className="font-semibold underline-offset-4 hover:underline">
          Tutup
        </button>
      </div>
    </div>
  );
}
