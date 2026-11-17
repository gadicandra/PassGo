"use client";

import { CalendarPlus, Download } from "lucide-react";
import type { EventSummary } from "@/types/api";

type CalendarEvent = Pick<EventSummary, "title" | "slug" | "startAt" | "endAt" | "venueName"> & { venueAddress?: string | null };

// 2026-11-27T12:00:00.000Z → 20261127T120000Z (format tanggal UTC kalender).
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const location = (event: CalendarEvent) => [event.venueName, event.venueAddress].filter(Boolean).join(", ");

function googleUrl(event: CalendarEvent, link: string) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.startAt)}/${stamp(event.endAt)}`,
    location: location(event),
    details: `Tiket PassGo: ${link}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Berkas .ics (iPhone, Outlook, kalender lain). Teks di-escape sesuai RFC 5545. */
function icsFile(event: CalendarEvent, link: string) {
  const escape = (text: string) => text.replace(/[\\,;]/g, (char) => `\\${char}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PassGo//Tiket//ID",
    "BEGIN:VEVENT",
    `UID:${event.slug}@passgo`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startAt)}`,
    `DTEND:${stamp(event.endAt)}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(location(event))}`,
    `DESCRIPTION:${escape(`Tiket PassGo: ${link}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

const button =
  "inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 text-[14px] font-semibold text-navy transition-colors hover:border-navy/30 hover:bg-navy/[0.03]";

/** "Tambah ke kalender": Google Calendar (tab baru) dan unduh .ics dengan pengingat 2 jam sebelumnya. */
export function AddToCalendar({ event }: { event: CalendarEvent }) {
  const link = () => `${window.location.origin}/events/${event.slug}`;

  function downloadIcs() {
    const url = URL.createObjectURL(new Blob([icsFile(event, link())], { type: "text/calendar;charset=utf-8" }));
    const anchor = Object.assign(document.createElement("a"), { href: url, download: `${event.slug}.ics` });
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-label="Tambah ke kalender" className="mt-6">
      <h2 className="text-[15px] font-semibold">Tambah ke kalender</h2>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <button type="button" className={button} onClick={() => window.open(googleUrl(event, link()), "_blank", "noopener,noreferrer")}>
          <CalendarPlus aria-hidden className="size-4 text-brand" />
          Google Calendar
        </button>
        <button type="button" className={button} onClick={downloadIcs}>
          <Download aria-hidden className="size-4 text-teal" />
          iPhone / Outlook (.ics)
        </button>
      </div>
    </section>
  );
}
