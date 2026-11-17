"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EventForm, bodyFromValues, emptyEventValues } from "@/components/organizer/EventForm";
import { PosterPicker } from "@/components/organizer/PosterUpload";
import { useToast } from "@/components/ui/Toast";
import { createEvent, uploadPoster } from "@/lib/organizer/api";
import { errorMessage } from "@/lib/organizer/errors";

export function CreateEvent() {
  const router = useRouter();
  const toast = useToast();
  const [poster, setPoster] = useState<File | null>(null);

  return (
    <>
      <Link href="/organizer/events" className="text-[14px] font-semibold text-muted underline-offset-4 hover:text-navy hover:underline">
        Semua acara
      </Link>
      <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Buat acara</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Acara disimpan sebagai draf dan belum terlihat di katalog. Setelah ini tambahkan tipe tiket, lalu terbitkan.
      </p>

      <div className="mt-10">
        <EventForm
          initial={emptyEventValues}
          submitLabel="Simpan draf"
          submitVariant="primary"
          aside={<PosterPicker file={poster} onChange={setPoster} />}
          onSubmit={async (values) => {
            const event = await createEvent(bodyFromValues(values));
            if (poster) {
              try {
                await uploadPoster(event, poster);
              } catch (error) {
                toast.error(`Draf tersimpan, tapi poster gagal diunggah: ${errorMessage(error)}`);
              }
            }
            toast.success("Draf tersimpan. Tambahkan tipe tiket.");
            router.push(`/organizer/events/${event.id}/tickets`);
          }}
        />
      </div>
    </>
  );
}
