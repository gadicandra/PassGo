"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { EventCard } from "@/components/event/EventCard";
import { SectionHeading } from "@/components/event/SectionHeading";
import { useSavedEvents } from "@/lib/saved";
import type { EventSummary } from "@/types/api";

/** Daftar acara ♡ dari browser ini. Data kartu = cuplikan saat disimpan; halaman acara selalu memuat data terbaru. */
export function SavedEvents() {
  const saved = useSavedEvents();

  return (
    <>
      <SectionHeading title="Acara disimpan" icon={Heart} />
      {saved.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-navy/20 bg-white px-6 py-10">
          <p className="text-[18px] font-semibold">Belum ada acara yang disimpan.</p>
          <p className="text-muted">Tekan ♡ di kartu acara supaya mudah ditemukan lagi nanti.</p>
          <Link href="/" className="inline-block py-1 font-semibold text-brand hover:underline">
            Jelajahi acara
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {saved.map((event, index) => (
            <EventCard key={event.id} event={event as EventSummary} tone={index} />
          ))}
        </div>
      )}
    </>
  );
}
