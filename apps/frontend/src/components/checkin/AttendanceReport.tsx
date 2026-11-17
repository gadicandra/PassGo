"use client";

import { useEffect, useState } from "react";
import type { CheckInResult } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/format";
import { getAttendanceReport } from "@/lib/tickets/api";
import { errorMessage } from "@/lib/tickets/errors";
import { resultLabel } from "@/lib/tickets/checkin";
import type { AttendanceReport as Report } from "@/lib/tickets/types";

const POLL_MS = 10_000;

const rejectedOrder: Array<Exclude<CheckInResult, "ACCEPTED">> = ["ALREADY_CHECKED_IN", "TICKET_VOID", "WRONG_EVENT", "NOT_FOUND", "CHECK_IN_CLOSED"];

function Bar({ value, total }: { value: number; total: number }) {
  const percent = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-navy/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-teal transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function AttendanceReport({ eventId, timezone }: { eventId: string; timezone: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    const run = () =>
      getAttendanceReport(eventId)
        .then((loaded) => {
          if (!active) return;
          setReport(loaded);
          setUpdatedAt(new Date());
          setError(null);
        })
        .catch((caught) => active && setError(errorMessage(caught, "Gagal memuat laporan kehadiran.")))
        .finally(() => active && setRefreshing(false));
    run();
    const timer = setInterval(run, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [eventId, tick]);

  function refresh() {
    setRefreshing(true);
    setTick((count) => count + 1);
  }

  if (!report) {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-danger" role="alert">{error}</p>
          <Button variant="dark" onClick={refresh} loading={refreshing}>Coba lagi</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4" aria-busy aria-label="Memuat laporan">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const issued = report.ticketsValid + report.ticketsCheckedIn;
  const rejectedTotal = rejectedOrder.reduce((sum, key) => sum + report.rejectedScans[key], 0);

  return (
    <div className="flex flex-col gap-10">
      <section aria-label="Ringkasan kehadiran" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[56px] font-semibold leading-none tabular-nums text-teal">{report.ticketsCheckedIn}</p>
          <p className="text-[18px] text-muted">dari {issued} tiket sudah masuk</p>
        </div>
        <Bar value={report.ticketsCheckedIn} total={issued} />
        <dl className="grid grid-cols-3 gap-4 text-[15px] md:max-w-lg">
          <div>
            <dt className="text-muted">Belum masuk</dt>
            <dd className="text-[20px] font-semibold tabular-nums">{report.ticketsValid}</dd>
          </div>
          <div>
            <dt className="text-muted">Sudah masuk</dt>
            <dd className="text-[20px] font-semibold tabular-nums">{report.ticketsCheckedIn}</dd>
          </div>
          <div>
            <dt className="text-muted">Dibatalkan</dt>
            <dd className="text-[20px] font-semibold tabular-nums">{report.ticketsVoid}</dd>
          </div>
        </dl>
        <p className="text-[14px] text-muted">
          {report.lastCheckInAt ? `Check-in terakhir ${formatDateTime(report.lastCheckInAt, timezone)}.` : "Belum ada yang check-in."}
        </p>
      </section>

      <section aria-label="Kehadiran per tipe tiket">
        <h2 className="text-[20px] font-semibold">Per tipe tiket</h2>
        {report.byTicketType.length === 0 ? (
          <p className="mt-3 text-muted">Acara ini belum punya tipe tiket.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {report.byTicketType.map((type) => (
              <li key={type.ticketTypeId} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-3 md:grid-cols-[220px_1fr_120px]">
                <span className="font-semibold">{type.ticketTypeName}</span>
                <span className="text-right tabular-nums md:order-3">
                  {type.ticketsCheckedIn} / {type.ticketsIssued}
                </span>
                <div className="col-span-2 md:col-span-1 md:order-2">
                  <Bar value={type.ticketsCheckedIn} total={type.ticketsIssued} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Pindaian ditolak">
        <h2 className="text-[20px] font-semibold">Pindaian ditolak</h2>
        <p className="mt-1 text-[14px] text-muted">{rejectedTotal === 0 ? "Tidak ada pindaian yang ditolak." : `${rejectedTotal} pindaian tidak menghasilkan check-in.`}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 md:max-w-lg">
          {rejectedOrder.map((key) => (
            <div key={key} className="flex justify-between gap-4 border-b border-line py-1.5">
              <dt className="text-muted">{resultLabel[key]}</dt>
              <dd className="font-semibold tabular-nums">{report.rejectedScans[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm" onClick={refresh} loading={refreshing}>
          Perbarui sekarang
        </Button>
        <p className="text-[13px] text-muted" aria-live="polite">
          {error ? <span className="text-danger">{error}</span> : updatedAt ? `Diperbarui otomatis, terakhir ${updatedAt.toLocaleTimeString("id-ID")}.` : ""}
        </p>
      </div>
    </div>
  );
}
