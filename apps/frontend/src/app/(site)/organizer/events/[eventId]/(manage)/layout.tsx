import { EventManageShell } from "@/components/organizer/EventManage";
import { OrganizerGate } from "@/components/organizer/OrganizerGate";

// Grup (manage): Detail, Tipe tiket, Panitia, Penjualan berbagi header + data acara.
// Halaman attendees/ & attendance/ (modul tiket) sengaja di luar grup ini supaya tidak ikut layout ini.
export default async function ManageEventLayout({ children, params }: LayoutProps<"/organizer/events/[eventId]">) {
  const { eventId } = await params;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <OrganizerGate>
        <EventManageShell eventId={eventId}>{children}</EventManageShell>
      </OrganizerGate>
    </div>
  );
}
