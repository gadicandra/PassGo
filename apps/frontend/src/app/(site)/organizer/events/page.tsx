import type { Metadata } from "next";
import { OrganizerGate } from "@/components/organizer/OrganizerGate";
import { EventList } from "./EventList";

export const metadata: Metadata = { title: "Acara" };

export default function OrganizerEventsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <OrganizerGate>
        <EventList />
      </OrganizerGate>
    </div>
  );
}
