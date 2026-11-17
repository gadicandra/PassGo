import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { daysUntilLabel, formatTime } from "@/lib/format";
import { Reveal } from "@/components/ui/Reveal";
import { Poster } from "./Poster";
import { PriceLabel } from "./PriceLabel";

const TZ = "Asia/Jakarta";
const ymd = (iso: string, timeZone = TZ) =>
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

/**
 * Agenda ala Luma: kolom linimasa (label tanggal + kartu acara) dan panel samping berisi
 * kalender mini bulan acara pertama. Tanggal bertitik = ada acara; klik untuk lompat ke tanggal itu.
 */
export function AgendaList({ events }: { events: EventSummary[] }) {
  const groups = byDate(events);
  let index = 0;
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
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
              <ul className="mt-3 flex flex-col gap-3">
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

      {groups.length > 0 && <MiniCalendar groups={groups} />}
    </div>
  );
}

/** Kalender bulan acara pertama; hari yang punya acara bertitik dan bisa diklik. Senin di kolom pertama. */
function MiniCalendar({ groups }: { groups: Array<{ key: string; events: EventSummary[] }> }) {
  const [year, month] = groups[0].key.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // 0 = Senin
  const withEvents = new Map(groups.map((group) => [group.key, group.events.length]));
  const today = ymd(new Date().toISOString());
  const monthName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const inMonth = groups.filter((group) => group.key.startsWith(`${groups[0].key.slice(0, 7)}`)).reduce((sum, group) => sum + group.events.length, 0);

  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <aside aria-label="Kalender acara" className="hidden rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-28 lg:block">
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Kalender</p>
      <p className="mt-0.5 text-[18px] font-bold capitalize">{monthName}</p>
      <p className="text-[13px] text-muted">{inMonth} acara bulan ini</p>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px]">
        {["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"].map((day) => (
          <span key={day} className="py-1 font-semibold text-muted">
            {day}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`kosong-${i}`} />;
          const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = withEvents.get(key);
          const base = "relative flex aspect-square items-center justify-center rounded-lg text-[13px] tabular-nums";
          if (!count) {
            return (
              <span key={key} className={cn(base, key === today ? "font-bold text-brand" : "text-navy/50")}>
                {day}
              </span>
            );
          }
          return (
            <a
              key={key}
              href={`#agenda-${key}`}
              aria-label={`${day} ${monthName}: ${count} acara`}
              className={cn(base, "bg-brand/10 font-bold text-brand transition-colors hover:bg-brand hover:text-white")}
            >
              {day}
              <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-current" />
            </a>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[12px] text-muted">
        <span aria-hidden className="size-2 rounded-full bg-brand" /> Ada acara, klik untuk melihat
      </p>
    </aside>
  );
}
