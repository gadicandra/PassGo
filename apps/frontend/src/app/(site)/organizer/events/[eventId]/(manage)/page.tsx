import type { Metadata } from "next";
import { EventDetails } from "./EventDetails";

export const metadata: Metadata = { title: "Kelola acara" };

export default function ManageEventPage() {
  return <EventDetails />;
}
