"use client";

import { useSyncExternalStore } from "react";
import type { EventSummary } from "@/types/api";

// Acara yang disimpan (♡) di browser ini. ponytail: localStorage per perangkat; pindah ke endpoint
// /me/saved-events bila perlu sinkron antar perangkat.
const KEY = "passgo:saved-events";
const CHANGED = "passgo:saved-changed";

export type SavedEvent = Pick<
  EventSummary,
  "id" | "slug" | "title" | "startAt" | "endAt" | "timezone" | "venueName" | "posterUrl" | "status" | "salesStatus" | "priceFrom" | "isEnded" | "stats"
>;

const EMPTY: SavedEvent[] = [];
let cache: { raw: string | null; list: SavedEvent[] } = { raw: null, list: EMPTY };

function read(): SavedEvent[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // Snapshot harus stabil antar panggilan (syarat useSyncExternalStore): parse ulang hanya bila isinya berubah.
  if (raw !== cache.raw) {
    let list: SavedEvent[] = EMPTY;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      list = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      list = EMPTY;
    }
    cache = { raw, list };
  }
  return cache.list;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => event.key === KEY && onChange();
  window.addEventListener("storage", onStorage); // tab lain
  window.addEventListener(CHANGED, onChange); // tab ini
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function useSavedEvents(): SavedEvent[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleSaved(event: SavedEvent): boolean {
  const list = read();
  const exists = list.some((item) => item.id === event.id);
  const next = exists
    ? list.filter((item) => item.id !== event.id)
    : [
        {
          id: event.id,
          slug: event.slug,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          timezone: event.timezone,
          venueName: event.venueName,
          posterUrl: event.posterUrl,
          status: event.status,
          salesStatus: event.salesStatus,
          priceFrom: event.priceFrom,
          isEnded: event.isEnded,
          stats: null,
        },
        ...list,
      ];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return exists; // penyimpanan diblokir (mode privat): status tidak berubah
  }
  window.dispatchEvent(new Event(CHANGED));
  return !exists;
}
