import type { Metadata } from "next";
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
          <div className="text-[16px] md:text-[18px]">
            <p>
              {formatDateLong(event.startAt, event.timezone)} · {formatTime(event.startAt, event.timezone)}–
              {formatTime(event.endAt, event.timezone)} WIB
            </p>
            <p>{event.venueName}</p>
          </div>
          {cancelled && (
            <p className="font-semibold text-danger">
              Dibatalkan{event.cancelReason ? `: ${event.cancelReason}` : "."}
            </p>
          )}
        </div>
        <div aria-hidden className="absolute bottom-0 left-[70%] top-0 hidden border-r-2 border-dotted border-current opacity-40 md:block" />
        <div className="hidden w-[30%] items-center justify-center md:flex">
          <Poster event={event} size="lg" className="w-[240px] -translate-y-6 rotate-[4deg] border-2 border-navy shadow-hard" />
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="order-2 flex flex-col gap-10 lg:order-1 lg:col-span-7">
          <section>
            <h2 className="text-[20px] font-semibold">Tentang</h2>
            <div className="mt-3 max-w-[60ch] space-y-4 font-serif text-[18px] leading-[1.65] text-navy/90">
              {paragraphs.length ? (
                paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p className="text-muted">Belum ada deskripsi.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold">Lokasi</h2>
            <p className="mt-3 font-semibold">{event.venueName}</p>
            {event.venueAddress && <p className="text-navy/75">{event.venueAddress}</p>}
            {event.mapsUrl && (
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-semibold underline underline-offset-4 hover:text-brand"
              >
                Buka di Maps
              </a>
            )}
          </section>
        </div>

        <aside className="order-1 lg:order-2 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <TicketPicker event={event} />
          </div>
        </aside>
      </div>
    </div>
  );
}
