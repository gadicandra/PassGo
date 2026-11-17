import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, Info, MapPin } from "lucide-react";
import { ShareButtons } from "@/components/event/ShareButtons";
import { categories } from "@/lib/categories";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Poster, posterPalette } from "@/components/event/Poster";
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
  const palette = cancelled ? { bg: "bg-navy/10", fg: "text-navy/60" } : posterPalette(event);
  const tags = categories.filter((category) => category.match.test(event.title));
  const paragraphs = event.description.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <header
        style={{ "--notch-x": "70%", "--notch-size": "16px" } as CSSProperties}
        className={cn("relative flex rounded-2xl md:ticket-notch md:min-h-[380px]", palette.bg, palette.fg)}
      >
        <div className="flex w-full flex-col justify-end gap-5 p-6 md:w-[70%] md:p-12 md:pr-14">
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
            <p className="font-semibold text-danger">
              Dibatalkan{event.cancelReason ? `: ${event.cancelReason}` : "."}
            </p>
          )}
        </div>
        <div aria-hidden className="absolute bottom-0 left-[70%] top-0 hidden border-r-2 border-dotted border-current opacity-40 md:block" />
        <div className="hidden w-[30%] items-center justify-center md:flex">
          <Poster event={event} size="lg" className="w-[240px] -translate-y-6 rotate-[4deg] shadow-card-hover" />
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="order-2 flex flex-col gap-10 lg:order-1 lg:col-span-7">
          <section>
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

          <section>
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
                className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 hover:text-brand"
              >
                Buka di Maps
                <ExternalLink aria-hidden className="size-4" />
              </a>
            )}
          </section>
        </div>

        <aside className="order-1 lg:order-2 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <TicketPicker event={event} />
            <ShareButtons title={event.title} />
          </div>
        </aside>
      </div>
    </div>
  );
}
