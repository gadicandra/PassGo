import type { Metadata } from "next";
import { AttendeesView } from "@/components/checkin/AttendeesView";

export const metadata: Metadata = { title: "Daftar peserta" };

export default async function AttendeesPage({ params }: PageProps<"/organizer/events/[eventId]/attendees">) {
  const { eventId } = await params;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <AttendeesView eventId={eventId} />
    </div>
  );
}
