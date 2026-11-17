import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { EventSummary } from "@/types/api";
import { daysUntilLabel, formatTime } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";
import { Poster } from "./Poster";
import { PriceLabel } from "./PriceLabel";

const ymd = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const label = (iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("id-ID", { timeZone, ...options }).format(new Date(iso));

/** Kelompokkan acara per tanggal kalender di zona acara; urutan masukan dipertahankan. */
function byDate(events: EventSummary[]) {
  const groups: Array<{ key: string; first: EventSummary; events: EventSummary[] }> = [];
  for (const event of events) {
    const key = ymd(event.startAt, event.timezone);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.events.push(event);
    else groups.push({ key, first: event, events: [event] });
  }
  return groups;
}

/** Agenda ala Luma: label tanggal di garis putus-putus, acara pada tanggal itu tampil sebagai kartu (2 kolom di desktop). */
export function AgendaList({ events }: { events: EventSummary[] }) {
  const groups = byDate(events);
  let index = 0;
  return (
    <ol className="relative ml-1.5 border-l-2 border-dashed border-navy/15 pl-6 md:pl-8">
        {groups.map((group) => {
          const soon = daysUntilLabel(group.first.startAt, group.first.timezone);
          return (
            <li key={group.key} id={`agenda-${group.key}`} className="relative scroll-mt-28 pb-8 last:pb-0">
              <span aria-hidden className="absolute -left-[33px] top-1 size-3.5 rounded-full border-[3px] border-cream bg-brand ring-1 ring-brand/30 md:-left-[41px]" />
              <p className="flex flex-wrap items-baseline gap-x-2 text-[16px] font-bold">
                {label(group.first.startAt, group.first.timezone, { day: "numeric", month: "long" })}
                <span className="font-medium text-muted">{label(group.first.startAt, group.first.timezone, { weekday: "long" })}</span>
                {soon && <span className="text-[13px] font-semibold text-brand">· {soon}</span>}
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {group.events.map((event) => {
                  const tone = index++;
                  return (
                    <li key={event.id}>
                      <Reveal index={tone % 3}>
                        <Link
                          href={`/events/${event.slug}`}
                          className="group flex items-stretch gap-4 rounded-2xl border border-line bg-white p-3 pr-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-card-hover md:gap-5"
                        >
                          <div className="w-[88px] shrink-0 overflow-hidden rounded-xl md:w-[112px]">
                            <Poster event={event} size="sm" tone={tone} className="transition-transform duration-300 group-hover:scale-[1.05]" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
                            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
                              <Clock aria-hidden className="size-3.5 shrink-0" />
                              {formatTime(event.startAt, event.timezone)}–{formatTime(event.endAt, event.timezone)} WIB
                            </p>
                            <h3 className="mt-1 line-clamp-2 text-[16px] font-semibold leading-snug text-navy transition-colors group-hover:text-brand md:text-[18px]">
                              {event.title}
                            </h3>
                            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                              <MapPin aria-hidden className="size-3.5 shrink-0" />
                              <span className="truncate">{event.venueName}</span>
                            </p>
                            <div className="mt-2.5 border-t border-dashed border-navy/15 pt-2">
                              <PriceLabel event={event} />
                            </div>
                          </div>
                        </Link>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
    </ol>
  );
}
