import type { Metadata } from "next";
import { TicketList } from "./TicketList";

export const metadata: Metadata = { title: "Tiket saya" };

export default function TicketsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Tiket saya</h1>
      <TicketList />
    </div>
  );
}
