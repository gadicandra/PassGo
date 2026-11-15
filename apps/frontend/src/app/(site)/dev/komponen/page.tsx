import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { EventSummary } from "@/types/api";
import { EventCard } from "@/components/event/EventCard";
import { Poster } from "@/components/event/Poster";
import { Perforation, TicketStub } from "@/components/event/TicketStub";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Select, TextArea } from "@/components/ui/Field";
import { EventCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ToastDemo } from "./ToastDemo";

// Etalase komponen bersama untuk tim. Data di sini contoh, JANGAN dipakai di halaman asli.
// Hapus route ini sebelum pengumpulan.
export const metadata: Metadata = { title: "Komponen", robots: { index: false } };

const base: Omit<EventSummary, "id" | "slug" | "title" | "salesStatus" | "priceFrom" | "status"> = {
  startAt: "2026-10-10T02:00:00.000Z",
  endAt: "2026-10-10T06:00:00.000Z",
  timezone: "Asia/Jakarta",
  venueName: "Ruang Kreatif Kotabaru",
  posterUrl: null,
  isEnded: false,
  stats: null,
};

const samples: EventSummary[] = [
  { ...base, id: "a1", slug: "workshop-cetak-cukil", title: "Workshop Cetak Cukil", status: "PUBLISHED", salesStatus: "ON_SALE", priceFrom: 75000 },
  { ...base, id: "b22", slug: "lapak-zine", title: "Lapak Zine Kotabaru", status: "PUBLISHED", salesStatus: "ON_SALE", priceFrom: 0 },
  { ...base, id: "c333", slug: "malam-puisi", title: "Malam Puisi dan Akustik", status: "PUBLISHED", salesStatus: "SOLD_OUT", priceFrom: 35000 },
  { ...base, id: "d4444", slug: "film-pendek", title: "Pemutaran Film Pendek Jogja", status: "CANCELLED", salesStatus: "ENDED", priceFrom: 25000 },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6">
      <h2 className="text-[20px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function KomponenPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-12 md:px-8">
      <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em]">Komponen</h1>

      <Section title="EventCard">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {samples.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </Section>

      <Section title="TicketStub">
        <div className="grid gap-6 rounded-card bg-sun p-6 md:grid-cols-2">
          {samples.slice(0, 2).map((event) => (
            <TicketStub key={event.id} notchBg="var(--color-sun)" thumb={<Poster event={event} size="sm" />}>
              <h3 className="font-display text-[16px] font-extrabold leading-snug">{event.title}</h3>
              <p className="text-[13px] text-muted">{event.venueName}</p>
            </TicketStub>
          ))}
        </div>
        <div className="max-w-sm overflow-hidden rounded-card border-2 border-navy bg-white p-5">
          <p className="font-display text-[20px] font-extrabold">Workshop Cetak Cukil</p>
          <Perforation className="-mx-5" />
          <p className="font-mono text-[18px]">7K2M-9XDQ-4R8B-3N5P</p>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Beli tiket</Button>
          <Button variant="dark">Lanjutkan</Button>
          <Button variant="outline">Batal</Button>
          <Button variant="text">Lihat semua</Button>
          <Button loading>Memproses</Button>
          <Button disabled>Nonaktif</Button>
          <ButtonLink href="/" variant="outline" size="sm">
            Link kecil
          </ButtonLink>
        </div>
      </Section>

      <Section title="Field">
        <form className="grid max-w-xl gap-4">
          <Field name="email" label="Email" type="email" placeholder="nama@email.com" className="max-w-[360px]" />
          <Field name="phone" label="Nomor HP (opsional)" className="max-w-[200px]" error="Format nomor tidak valid." />
          <Field name="password" label="Password" type="password" hint="Minimal 8 karakter" className="max-w-[360px]" />
          <Select name="status" label="Status" className="max-w-[200px]" defaultValue="PUBLISHED">
            <option value="PUBLISHED">Terbit</option>
            <option value="DRAFT">Draf</option>
          </Select>
          <TextArea name="description" label="Deskripsi" />
          <FormError>Presale tinggal 1 tiket.</FormError>
        </form>
      </Section>

      <Section title="Skeleton & Toast">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <EventCardSkeleton />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <ToastDemo />
      </Section>
    </div>
  );
}
