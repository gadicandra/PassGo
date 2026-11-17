import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, Info, MapPin } from "lucide-react";
import { ShareButtons } from "@/components/event/ShareButtons";
import { AddToCalendar } from "@/components/event/AddToCalendar";
import { SaveButton } from "@/components/event/SaveButton";
import { SectionTabs } from "@/components/event/SectionTabs";
import { StickyBuyBar } from "@/components/event/StickyBuyBar";
import { eventPriceLine } from "@/lib/status";
import { categories, posterSrc } from "@/lib/categories";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Poster } from "@/components/event/Poster";
import { TicketPicker } from "@/components/event/TicketPicker";
import { cn } from "@/lib/cn";
import { formatDateLong, formatTime } from "@/lib/format";
import { getEventBySlug } from "@/lib/public-api";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return { title: event?.title ?? "Acara tidak ditemukan" };
}

export default async function EventDetailPage({ params }: PageProps<"/events/[slug]">) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();

  const cancelled = event.status === "CANCELLED";
  const tags = categories.filter((category) => category.match.test(event.title));
  const paragraphs = event.description.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <header
        style={{ "--notch-x": "70%", "--notch-size": "16px" } as CSSProperties}
        className="relative flex overflow-hidden rounded-2xl bg-navy text-cream md:ticket-notch md:min-h-[400px]"
      >
        {/* Latar foto acara yang diburamkan + gelap (pola Loket & Luma), supaya header terasa "acara ini". */}
        {/* eslint-disable-next-line @next/next/no-img-element -- foto poster/stok, dekoratif */}
        <img
          src={posterSrc(event)}
          alt=""
          aria-hidden
          className={cn("absolute inset-0 size-full scale-125 object-cover opacity-70 blur-2xl", cancelled && "grayscale")}
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/40" />
        <div className="relative flex w-full flex-col justify-end gap-5 p-6 md:w-[70%] md:p-12 md:pr-14">
          <h1
            className={cn(
              "font-display text-[40px] font-extrabold leading-none tracking-[-0.01em] md:text-[64px]",
              cancelled && "line-through",
            )}
          >
            {event.title}
          </h1>
          {/* Baris info berikon (pola Loket): tanggal, jam, tempat, lalu label kategori. */}
          <ul className="flex flex-col gap-2 text-[16px] font-medium md:text-[17px]">
            <li className="flex items-center gap-2.5">
              <CalendarDays aria-hidden className="size-5 shrink-0 opacity-80" />
              {formatDateLong(event.startAt, event.timezone)}
            </li>
            <li className="flex items-center gap-2.5">
              <Clock aria-hidden className="size-5 shrink-0 opacity-80" />
              {formatTime(event.startAt, event.timezone)}–{formatTime(event.endAt, event.timezone)} WIB
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin aria-hidden className="size-5 shrink-0 opacity-80" />
              {event.venueName}
            </li>
          </ul>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/?kategori=${tag.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[13px] font-semibold text-navy transition-colors hover:bg-white"
                  >
                    <tag.icon aria-hidden className="size-3.5" />
                    {tag.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {cancelled && (
            <p className="w-fit rounded-md bg-danger px-3 py-1.5 font-semibold text-white">
              Dibatalkan{event.cancelReason ? `: ${event.cancelReason}` : "."}
            </p>
          )}
        </div>
        <div aria-hidden className="absolute bottom-0 left-[70%] top-0 hidden border-r-2 border-dotted border-cream/40 md:block" />
        <div className="relative hidden w-[30%] items-center justify-center md:flex">
          {/* Lebar diatur pembungkus: Poster selalu w-full, jadi kelas lebar langsung di Poster tidak berlaku. */}
          <div className="w-[210px] lg:w-[230px]">
            <Poster event={event} size="lg" className="shadow-[0_20px_40px_rgb(0_0_0/0.35)]" />
          </div>
        </div>
      </header>

      <div className="mt-6">
        <SectionTabs
          tabs={[
            { id: "tentang", label: "Deskripsi" },
            { id: "pilih-tiket", label: "Tiket" },
            { id: "lokasi", label: "Lokasi" },
          ]}
        />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="order-2 flex flex-col gap-10 lg:order-1 lg:col-span-7">
          <section id="tentang" className="scroll-mt-36">
            <h2 className="flex items-center gap-2 text-[20px] font-semibold">
              <Info aria-hidden className="size-5 text-brand" />
              Tentang acara
            </h2>
            <div className="mt-3 max-w-[60ch] space-y-4 font-serif text-[18px] leading-[1.65] text-navy/90">
              {paragraphs.length ? (
                paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p className="text-muted">Belum ada deskripsi.</p>
              )}
            </div>
          </section>

          <section id="lokasi" className="scroll-mt-36">
            <h2 className="flex items-center gap-2 text-[20px] font-semibold">
              <MapPin aria-hidden className="size-5 text-brand" />
              Lokasi
            </h2>
            <p className="mt-3 font-semibold">{event.venueName}</p>
            {event.venueAddress && <p className="text-navy/75">{event.venueAddress}</p>}
            {event.mapsUrl && (
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 py-1 font-semibold underline underline-offset-4 hover:text-brand"
              >
                Buka di Maps
                <ExternalLink aria-hidden className="size-4" />
              </a>
            )}
          </section>
        </div>

        <aside className="order-1 lg:order-2 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div id="pilih-tiket" className="scroll-mt-36">
              <TicketPicker event={event} />
            </div>
            {!cancelled && <SaveButton event={event} variant="labeled" className="mt-6" />}
            <AddToCalendar event={event} />
            <ShareButtons title={event.title} />
          </div>
        </aside>
      </div>
      {!cancelled && event.salesStatus === "ON_SALE" && <StickyBuyBar priceLabel={eventPriceLine(event).label} />}
    </div>
  );
}
