"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiEnvelope, errorMessage } from "@/lib/api";
import { RequireAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/types/api";

// Daftar aksi dari kontrak §9.14.
const ACTIONS = [
  "USER_CREATED", "USER_UPDATED", "USER_ROLE_CHANGED", "USER_DEACTIVATED", "USER_REACTIVATED",
  "EVENT_CREATED", "EVENT_UPDATED", "EVENT_DELETED", "EVENT_PUBLISHED", "EVENT_CANCELLED", "EVENT_POSTER_UPDATED",
  "TICKET_TYPE_CREATED", "TICKET_TYPE_UPDATED", "TICKET_TYPE_DELETED", "STAFF_ASSIGNED", "STAFF_UNASSIGNED",
  "ORDER_CANCELLED", "ORDER_PAID_LATE", "ORDER_REFUND_REQUIRED", "ORDER_REFUNDED",
  "TICKET_REISSUED", "CHECK_IN_REVERTED", "ATTENDEES_EXPORTED",
];

interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

/** "2026-10-10" → awal/akhir hari WIB dalam ISO. Backend menerima datetime ber-offset. */
const dayStart = (date: string) => (date ? `${date}T00:00:00.000+07:00` : undefined);
const dayEnd = (date: string) => (date ? `${date}T23:59:59.999+07:00` : undefined);

export default function AuditLogsPage() {
  return (
    <RequireAuth roles={["ORGANIZER"]}>
      <AuditLogs />
    </RequireAuth>
  );
}

function AuditLogs() {
  const toast = useToast();
  const [filters, setFilters] = useState({ action: "", from: "", to: "" });
  const [rows, setRows] = useState<AuditLog[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const fetchPage = useCallback(
    (after?: string) =>
      apiEnvelope<AuditLog[], CursorMeta>("/audit-logs", {
        query: { limit: 50, cursor: after, action: filters.action, from: dayStart(filters.from), to: dayEnd(filters.to) },
      }),
    [filters],
  );

  useEffect(() => {
    let cancelled = false;
    fetchPage()
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setCursor(result.meta?.hasMore ? result.meta.nextCursor : null);
      })
      .catch((caught) => {
        if (cancelled) return;
        toast.error(errorMessage(caught));
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  async function more() {
    setLoadingMore(true);
    try {
      const result = await fetchPage(cursor!);
      setRows((current) => [...(current ?? []), ...result.data]);
      setCursor(result.meta?.hasMore ? result.meta.nextCursor : null);
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-12 md:px-8">
      <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em]">Log audit</h1>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Select name="action" label="Aksi" value={filters.action} onChange={(e) => setFilter("action", e.target.value)}>
          <option value="">Semua aksi</option>
          {ACTIONS.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
        <Field name="from" label="Dari tanggal" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} />
        <Field name="to" label="Sampai tanggal" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} />
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white shadow-card">
        {rows === null &&
          Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </li>
          ))}
        {rows?.length === 0 && <li className="px-4 py-10 text-center text-muted">Belum ada catatan.</li>}
        {rows?.map((log) => (
          <li key={log.id} className="px-4 py-3">
            <button
              type="button"
              aria-expanded={open === log.id}
              onClick={() => setOpen(open === log.id ? null : log.id)}
              className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-left"
            >
              <span>
                <span className="font-mono text-sm font-semibold">{log.action}</span>
                <span className="ml-2 text-muted">
                  oleh {log.actor?.name ?? "Sistem"} · {log.entityType}
                </span>
              </span>
              <span className="text-sm text-muted">{formatDateTime(log.createdAt)}</span>
            </button>
            {open === log.id && (
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <Diff label="Sebelum" value={log.before} />
                <Diff label="Sesudah" value={log.after} />
                <p className="break-all text-muted md:col-span-2">
                  ID entitas <span className="font-mono">{log.entityId}</span>
                  {log.ip && <> · IP {log.ip}</>}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {cursor && (
        <Button variant="outline" loading={loadingMore} onClick={more} className="self-center">
          Muat lebih banyak
        </Button>
      )}
    </section>
  );
}

function Diff({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div>
      <div className="mb-1 font-semibold">{label}</div>
      <pre className="overflow-x-auto rounded-md bg-navy/5 p-3 font-mono text-xs">{value ? JSON.stringify(value, null, 2) : "—"}</pre>
    </div>
  );
}
