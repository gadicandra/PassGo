import type { Metadata } from "next";
import { OrganizerGate } from "@/components/organizer/OrganizerGate";
import { CreateEvent } from "./CreateEvent";

export const metadata: Metadata = { title: "Buat acara" };

export default function NewEventPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <OrganizerGate>
        <CreateEvent />
      </OrganizerGate>
    </div>
  );
}
