"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EventSummary } from "@/types/api";
import { Poster } from "@/components/event/Poster";
import { TicketStub } from "@/components/event/TicketStub";
import { AccessDenied, GateSkeleton } from "@/components/ticket/AccessDenied";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { errorMessage } from "@/lib/tickets/errors";
import { eventLinks } from "@/lib/tickets/links";
import { useRoleGate } from "@/lib/tickets/useRoleGate";

const ROLES = ["STAFF", "ORGANIZER"] as const;
const tabs = [
  { value: "upcoming", label: "Akan datang" },
  { value: "past", label: "Sudah lewat" },
] as const;
type When = (typeof tabs)[number]["value"];

interface Loaded {
  when: When;
  events: EventSummary[];
  error: string | null;
}

export function StaffEvents() {
  const gate = useRoleGate(ROLES);
  const { user } = useAuth();
  const [when, setWhen] = useState<When>("upcoming");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<(Loaded & { attempt: number }) | null>(null);
  const allowed = gate === "allowed";
  const role = user?.role;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const path = role === "STAFF" ? `/me/assigned-events?when=${when}` : `/events?when=${when}&pageSize=100&sort=${when === "upcoming" ? "startAt" : "-startAt"}`;
    api<EventSummary[]>(path)
      .then((events) => active && setLoaded({ when, attempt, events: events.filter((event) => event.status !== "DRAFT"), error: null }))
      .catch((caught) => active && setLoaded({ when, attempt, events: [], error: errorMessage(caught, "Gagal memuat acara.") }));
    return () => {
      active = false;
    };
  }, [allowed, role, when, attempt]);

  if (gate === "checking") return <div className="mt-8"><GateSkeleton /></div>;
  if (gate === "denied") return <AccessDenied message="Halaman ini untuk panitia dan penyelenggara." />;

  const loading = loaded?.when !== when || loaded.attempt !== attempt;

  return (
    <>
      <div role="tablist" aria-label="Waktu acara" className="mt-8 flex gap-8 border-b border-line">
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

      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy aria-label="Memuat acara">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-[170px] rounded-card" />
          ))}
        </div>
      )}

      {!loading && loaded?.error && (
        <div className="mt-8 flex flex-col items-start gap-3">
          <p className="text-danger" role="alert">{loaded.error}</p>
          <button type="button" className="font-semibold text-brand underline-offset-4 hover:underline" onClick={() => setAttempt((count) => count + 1)}>
            Coba lagi
          </button>
        </div>
      )}

      {!loading && loaded && !loaded.error && loaded.events.length === 0 && (
        <p className="mt-8 text-[18px] font-semibold">
          {role === "STAFF"
            ? when === "upcoming"
              ? "Belum ada acara mendatang yang ditugaskan kepadamu."
              : "Belum ada acara lampau yang kamu tangani."
            : "Tidak ada acara di rentang ini."}
        </p>
      )}

      {!loading && loaded && !loaded.error && loaded.events.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {loaded.events.map((event) => {
            const links = eventLinks(role, event.id);
            const cancelled = event.status === "CANCELLED";
            const sold = event.stats?.ticketsSold ?? 0;
            return (
              <li key={event.id}>
                <TicketStub thumb={<Poster event={event} size="sm" />}>
                  <div>
                    <Link href={links.attendance} className="font-semibold leading-snug hover:text-brand">
                      {event.title}
                    </Link>
                    <p className="text-[14px] text-muted">{formatDateTime(event.startAt, event.timezone)}</p>
                    <p className="text-[14px] text-muted">{event.venueName}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px]">
                      {cancelled ? (
                        <span className="font-semibold text-danger">Dibatalkan</span>
                      ) : (
                        <>
                          <span className="font-semibold tabular-nums text-teal">{event.stats?.checkedIn ?? 0}</span>
                          <span className="text-muted"> dari {sold} tiket masuk</span>
                        </>
                      )}
                    </p>
                    <div className="flex gap-2">
                      {!cancelled && (
                        <ButtonLink href={links.scan} variant="dark" size="sm">
                          Pindai
                        </ButtonLink>
                      )}
                      <ButtonLink href={links.attendees} variant="outline" size="sm">
                        Peserta
                      </ButtonLink>
                    </div>
                  </div>
                </TicketStub>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
