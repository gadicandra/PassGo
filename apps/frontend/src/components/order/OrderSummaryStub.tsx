import type { ReactNode } from "react";
import type { EventSummary } from "@/types/api";
import { Poster } from "@/components/event/Poster";
import { Perforation } from "@/components/event/TicketStub";
import { formatDateTime, formatRupiah } from "@/lib/format";

type StubEvent = Pick<EventSummary, "id" | "title" | "startAt" | "timezone" | "posterUrl" | "status" | "salesStatus"> & {
  venueName?: string;
};

/** Ringkasan pesanan berbentuk tiket: poster kecil + info acara | perforasi | rincian & total. */
export function OrderSummaryStub({
  event,
  lines,
  total,
  footer,
}: {
  event: StubEvent;
  lines: Array<{ label: string; amount: number }>;
  total: number;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex gap-4 p-5">
        <div className="w-24 shrink-0">
          <Poster event={event} size="sm" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{event.title}</p>
          <p className="mt-1 text-[14px] text-muted">{formatDateTime(event.startAt, event.timezone)}</p>
          {event.venueName && <p className="text-[14px] text-muted">{event.venueName}</p>}
        </div>
      </div>
      <Perforation className="mx-0 my-0" />
      <div className="flex flex-col gap-2 p-5">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-4 text-[15px]">
            <span>{line.label}</span>
            <span className="tabular-nums">{formatRupiah(line.amount, { freeLabel: false })}</span>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-semibold">Total</span>
          <span className="text-[24px] font-semibold tabular-nums">{formatRupiah(total)}</span>
        </div>
        {footer}
      </div>
    </div>
  );
}
