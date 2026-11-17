import type { Metadata } from "next";
import { TicketTypes } from "./TicketTypes";

export const metadata: Metadata = { title: "Tipe tiket" };

export default function TicketTypesPage() {
  return <TicketTypes />;
}
