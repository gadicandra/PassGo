"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/types/api";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

export function useEvent(eventId: string, enabled = true) {
  const [state, setState] = useState<{ event: Event | null; error: boolean }>({ event: null, error: false });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<Event>(`/events/${eventId}`)
      .then((event) => active && setState({ event, error: false }))
      .catch(() => active && setState({ event: null, error: true }));
    return () => {
      active = false;
    };
  }, [eventId, enabled]);
  return state;
}

export function EventHeader({ event, error, title }: { event: Event | null; error: boolean; title: string }) {
  return (
    <header>
      <h1 className="text-[30px] font-bold leading-tight tracking-[-0.01em] md:text-[36px]">{title}</h1>
      {event ? (
        <div className="mt-3 text-muted">
          <p className="font-semibold text-navy">{event.title}</p>
          <p className="text-[14px]">{formatDateTime(event.startAt, event.timezone)}</p>
        </div>
      ) : error ? (
        <p className="mt-3 text-danger" role="alert">Acara tidak ditemukan atau kamu tidak ditugaskan di acara ini.</p>
      ) : (
        <Skeleton className="mt-3 h-5 w-72" />
      )}
    </header>
  );
}
