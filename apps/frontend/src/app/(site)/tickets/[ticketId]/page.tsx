import type { Metadata } from "next";
import { TicketDetail } from "./TicketDetail";

export const metadata: Metadata = { title: "Tiket" };

export default async function TicketPage({ params }: PageProps<"/tickets/[ticketId]">) {
  const { ticketId } = await params;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <TicketDetail ticketId={ticketId} />
    </div>
  );
}
