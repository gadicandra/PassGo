"use client";

import { EventForm, eventPatch, valuesFromEvent } from "@/components/organizer/EventForm";
import { useManagedEvent } from "@/components/organizer/EventManage";
import { PosterPanel } from "@/components/organizer/PosterUpload";
import { useToast } from "@/components/ui/Toast";
import type { Event } from "@/types/api";
import { isEditable, updateEvent } from "@/lib/organizer/api";
import { currentFrom } from "@/lib/organizer/errors";

export function EventDetails() {
  const { event, setEvent } = useManagedEvent();
  const toast = useToast();
  const editable = isEditable(event);

  return (
    <>
      {!editable && (
        <p className="mb-8 rounded-md border border-line bg-white px-4 py-3 text-[15px] text-muted">
          {event.status === "CANCELLED" ? "Acara yang dibatalkan" : "Acara yang sudah berakhir"} tidak bisa diubah lagi.
        </p>
      )}
      {event.status === "PUBLISHED" && editable && (
        <p className="mb-8 max-w-3xl text-[15px] text-muted">
          Acara sudah terbit. Perubahan jadwal dicatat di log audit, dan pembeli tidak menerima pemberitahuan otomatis.
        </p>
      )}
      <EventForm
        key={event.id}
        initial={valuesFromEvent(event)}
        readOnly={!editable}
        submitLabel="Simpan perubahan"
        aside={<PosterPanel event={event} onEventChange={setEvent} />}
        onSubmit={async (values) => {
          const patch = eventPatch(event, values);
          if (Object.keys(patch).length === 0) {
            toast.info("Tidak ada perubahan.");
            return;
          }
          try {
            setEvent(await updateEvent(event, patch));
            toast.success("Perubahan tersimpan.");
          } catch (error) {
            // 412: simpan versi terbaru supaya simpan berikutnya tidak ditolak lagi; isian tetap di form.
            const current = currentFrom<Event>(error);
            if (current) setEvent(current);
            throw error;
          }
        }}
      />
    </>
  );
}
