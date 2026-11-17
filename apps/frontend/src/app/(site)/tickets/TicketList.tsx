"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Ticket } from "@/types/api";
import { AccessDenied, GateSkeleton } from "@/components/ticket/AccessDenied";
import { TicketCard } from "@/components/ticket/TicketCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { listMyTickets } from "@/lib/tickets/api";
import { errorMessage } from "@/lib/tickets/errors";
import type { CursorMeta } from "@/lib/tickets/types";
import { useRoleGate } from "@/lib/tickets/useRoleGate";
import { MetaList } from "@/components/ui/MetaList";
import { CalendarDays, MapPin } from "lucide-react";

const ROLES = ["ATTENDEE"] as const;
const tabs = [
  { value: "upcoming", label: "Akan datang" },
  { value: "past", label: "Sudah lewat" },
] as const;
type When = (typeof tabs)[number]["value"];

interface Loaded {
  key: string;
  items: Ticket[];
  meta: CursorMeta | null;
  error: string | null;
}

function groupByEvent(tickets: Ticket[]) {
  const groups = new Map<string, { event: Ticket["event"]; tickets: Ticket[] }>();
  for (const ticket of tickets) {
    const group = groups.get(ticket.event.id) ?? { event: ticket.event, tickets: [] };
    group.tickets.push(ticket);
    groups.set(ticket.event.id, group);
  }
  return [...groups.values()];
}

export function TicketList() {
  const gate = useRoleGate(ROLES);
  const toast = useToast();
  const [when, setWhen] = useState<When>("upcoming");
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const key = `${when}|${status}|${attempt}`;
  const allowed = gate === "allowed";

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    listMyTickets({ when, status: status || undefined })
      .then((page) => active && setLoaded({ key, items: page.data, meta: page.meta, error: null }))
      .catch((caught) => active && setLoaded({ key, items: [], meta: null, error: errorMessage(caught, "Gagal memuat tiket.") }));
    return () => {
      active = false;
    };
  }, [allowed, when, status, key]);

  async function loadMore() {
    if (!loaded?.meta?.nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listMyTickets({ when, status: status || undefined, cursor: loaded.meta.nextCursor });
      setLoaded({ key, items: [...loaded.items, ...page.data], meta: page.meta, error: null });
    } catch (caught) {
      toast.error(errorMessage(caught, "Gagal memuat tiket berikutnya."));
    } finally {
      setLoadingMore(false);
    }
  }

  if (gate === "checking") return <div className="mt-8"><GateSkeleton /></div>;
  if (gate === "denied") return <AccessDenied message="Tiket hanya untuk akun peserta." />;

  const loading = loaded?.key !== key;
  const groups = loaded && !loading ? groupByEvent(loaded.items) : [];

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line">
        <div role="tablist" aria-label="Waktu acara" className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={when === tab.value}
              onClick={() => setWhen(tab.value)}
              className={cn(
                "border-b-[3px] py-3 text-[15px] font-semibold transition-colors",
                when === tab.value ? "border-brand text-navy" : "border-transparent text-muted hover:text-navy",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Select name="status" label="Status tiket" value={status} onChange={(event) => setStatus(event.target.value)} className="mb-2 w-48">
          <option value="">Semua</option>
          <option value="VALID">Berlaku</option>
          <option value="CHECKED_IN">Sudah masuk</option>
          <option value="VOID">Tidak berlaku</option>
        </Select>
      </div>

      {loading && (
        <div className="mt-8 flex flex-col gap-4" aria-busy aria-label="Memuat tiket">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[150px] w-full rounded-card" />
          ))}
        </div>
      )}

      {!loading && loaded?.error && (
        <div className="mt-8 flex flex-col items-start gap-3">
          <p className="text-danger" role="alert">{loaded.error}</p>
          <Button variant="dark" onClick={() => setAttempt((count) => count + 1)}>
            Coba lagi
          </Button>
        </div>
      )}

      {!loading && loaded && !loaded.error && loaded.items.length === 0 && (
        <div className="mt-8 flex flex-col items-start gap-2">
          <p className="text-[18px] font-semibold">{status ? "Tidak ada tiket dengan status ini." : when === "upcoming" ? "Belum ada tiket untuk acara mendatang." : "Belum ada tiket dari acara yang sudah lewat."}</p>
          <Link href="/" className="font-semibold text-brand underline-offset-4 hover:underline">
            Cari acara
          </Link>
        </div>
      )}

      {groups.map(({ event, tickets }) => (
        <section key={event.id} className="mt-10" aria-label={event.title}>
          <h2 className="text-[22px] font-semibold leading-snug">
            <Link href={`/events/${event.slug}`} className="hover:text-brand">
              {event.title}
            </Link>
          </h2>
          <MetaList
            className="mt-1 text-[14px] text-muted"
            items={[{ icon: CalendarDays, children: formatDateTime(event.startAt, event.timezone) }, { icon: MapPin, children: event.venueName }]}
          />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      ))}

      {!loading && loaded?.meta?.hasMore && (
        <div className="mt-10">
          <Button variant="outline" loading={loadingMore} onClick={loadMore}>
            Muat tiket lainnya
          </Button>
        </div>
      )}
    </>
  );
}
