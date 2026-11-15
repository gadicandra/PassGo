import { ButtonLink } from "@/components/ui/Button";

// Placeholder. Diganti halaman katalog (GET /api/v1/events) oleh Marcel.
export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 px-4 py-16 md:px-8">
      <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] md:text-[56px]">
        Katalog acara
      </h1>
      <p className="text-muted">Halaman ini sedang dibangun.</p>
      <ButtonLink href="/dev/komponen" variant="outline">
        Lihat komponen
      </ButtonLink>
    </section>
  );
}
