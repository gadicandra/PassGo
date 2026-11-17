import Link from "next/link";
import type { EventSummary } from "@/types/api";
import { CatalogFilters, parseFilter, type CatalogFilter } from "@/components/event/CatalogFilters";
import { AgendaList } from "@/components/event/AgendaList";
import { EventCard } from "@/components/event/EventCard";
import { FeaturedEventTile } from "@/components/event/FeaturedEventTile";
import { HeroCarousel } from "@/components/event/HeroCarousel";
import { Poster } from "@/components/event/Poster";
import { SectionHeading } from "@/components/event/SectionHeading";
import { TicketStub } from "@/components/event/TicketStub";
import { formatDate } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";
import { listEvents, type EventListQuery } from "@/lib/public-api";

const filterTitle: Record<CatalogFilter, string> = {
  semua: "Semua acara",
  minggu: "Minggu ini",
  bulan: "Bulan ini",
  gratis: "Gratis",
};

/** Batas akhir rentang waktu filter, dihitung di zona WIB. */
function rangeFor(filter: CatalogFilter): Pick<EventListQuery, "from" | "to"> {
  const now = new Date();
  if (filter === "minggu") return { to: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  if (filter === "bulan") {
    const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" })
      .format(now)
      .split("-")
      .map(Number);
    const nextMonth = new Date(`${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, "0")}-01T00:00:00+07:00`);
    return { to: new Date(nextMonth.getTime() - 1).toISOString() };
  }
  return {};
}

const isFree = (event: EventSummary) => event.priceFrom === 0 && event.status !== "CANCELLED";
const isOnSale = (event: EventSummary) => event.status === "PUBLISHED" && event.salesStatus === "ON_SALE";

export default async function CatalogPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const rawQ = typeof params.q === "string" ? params.q.trim() : "";
  const q = rawQ.length >= 2 ? rawQ : undefined;

  const { data: events } = await listEvents({ q, when: "upcoming", pageSize: 100, ...rangeFor(filter) });
  const filtered = filter === "gratis" ? events.filter(isFree) : events;

  // Ada pencarian atau filter: tampilkan satu grid hasil saja.
  if (q || filter !== "semua") {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
        <CatalogFilters active={filter} q={q} />
        <section className="mt-8">
          <SectionHeading title={q ? `Hasil “${q}”` : filterTitle[filter]} count={filtered.length} />
          {filtered.length ? (
            <EventGrid events={filtered} />
          ) : (
            <div className="flex flex-col items-start gap-2 py-12">
              <p className="text-[18px] font-semibold">Belum ada acara yang cocok.</p>
              <Link href="/" className="font-semibold text-brand underline-offset-4 hover:underline">
                Hapus pencarian
              </Link>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-24 md:px-8">
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Acara</h1>
        <p className="mt-4 text-muted">Belum ada acara. Cek lagi minggu depan.</p>
      </div>
    );
  }

  // Tiap acara tampil sekali: hero → paling dekat → gratis → sisanya.
  const heroes = (events.filter(isOnSale).length ? events.filter(isOnSale) : events).slice(0, 2);
  let rest = events.filter((event) => !heroes.includes(event));
  const nearest = rest.slice(0, 3);
  rest = rest.slice(3);
  const free = rest.filter(isFree).slice(0, 3);
  const others = rest.filter((event) => !free.includes(event));

  return (
    <>
      <h1 className="sr-only">Katalog acara PassGo</h1>
      <HeroCarousel events={heroes} />

      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-8">
        <CatalogFilters active="semua" />
      </div>

      {nearest.length > 0 && (
        <section className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8">
          <SectionHeading title="Paling dekat" count={nearest.length} href="/?filter=minggu" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-12">
            <Reveal className="sm:col-span-2 lg:col-span-6">
              <FeaturedEventTile event={nearest[0]} tone={3} />
            </Reveal>
            {nearest.slice(1).map((event, index) => (
              <Reveal key={event.id} index={index + 1} className="lg:col-span-3">
                <EventCard event={event} tone={index + 1} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {free.length > 0 && (
        <section className="my-8 w-full border-y-2 border-navy bg-sun py-12">
          <div className="mx-auto max-w-[1200px] px-4 md:px-8">
            <SectionHeading title="Gratis, tinggal datang" count={free.length} href="/?filter=gratis" className="border-navy/20" />
            <div className="grid gap-6 md:grid-cols-3">
              {free.map((event, index) => (
                <Reveal key={event.id} index={index}>
                <Link href={`/events/${event.slug}`} className="group block h-full">
                  <TicketStub
                    notchBg="var(--color-sun)"
                    // Tanpa kuning: poster kuning di atas band kuning akan hilang.
                    thumb={<Poster event={event} size="sm" tone={[0, 1, 3][index % 3]} />}
                    className="h-full"
                  >
                    <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug group-hover:text-brand">
                      {event.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2 border-t border-navy/10 pt-2">
                      <p className="truncate text-[13px] text-muted">{event.venueName}</p>
                      <span className="shrink-0 text-[13px] font-semibold">{formatDate(event.startAt, event.timezone).replace(/ \d{4}$/, "")}</span>
                    </div>
                  </TicketStub>
                </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8">
          <SectionHeading title="Agenda berikutnya" count={others.length} />
          <AgendaList events={others} />
        </section>
      )}
    </>
  );
}

function EventGrid({ events }: { events: EventSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-6 lg:grid-cols-4">
      {events.map((event, index) => (
        // Jeda bertingkat per kolom (index % 4) supaya tiap baris yang masuk layar muncul kiri → kanan.
        <Reveal key={event.id} index={index % 4}>
          <EventCard event={event} tone={index} />
        </Reveal>
      ))}
    </div>
  );
}
