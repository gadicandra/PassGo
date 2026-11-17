import Link from "next/link";
import type { Ticket } from "@/types/api";
import { Poster } from "@/components/event/Poster";
import { TicketStub } from "@/components/event/TicketStub";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { ticketStatusLabel, toneClass } from "@/lib/status";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const status = ticketStatusLabel[ticket.status];
  return (
    <Link href={`/tickets/${ticket.id}`} className="group block transition-transform hover:-translate-y-0.5">
      <TicketStub thumb={<Poster event={ticket.event} size="sm" />} className="transition-shadow group-hover:shadow-card-hover">
        <div>
          <p className="truncate font-semibold leading-snug">{ticket.holderName}</p>
          <p className="text-[14px] text-muted">{ticket.ticketTypeName}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-[13px] text-muted">{ticket.codeMasked}</p>
          <p className={cn("text-[14px] font-semibold", toneClass[status.tone])}>
            {status.label}
            {ticket.status === "CHECKED_IN" && ticket.checkedInAt && (
              <span className="block text-[12px] font-normal text-muted">{formatDateTime(ticket.checkedInAt, ticket.event.timezone)}</span>
            )}
          </p>
        </div>
      </TicketStub>
    </Link>
  );
}
