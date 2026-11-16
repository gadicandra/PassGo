import type { Metadata } from "next";
import { EventAttendanceScreen } from "@/components/checkin/EventAttendanceScreen";

export const metadata: Metadata = { title: "Kehadiran" };

export default async function AttendancePage({ params }: PageProps<"/organizer/events/[eventId]/attendance">) {
  const { eventId } = await params;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <EventAttendanceScreen eventId={eventId} />
    </div>
  );
}
