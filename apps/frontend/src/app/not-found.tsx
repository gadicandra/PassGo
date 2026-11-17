import { ButtonLink } from "@/components/ui/Button";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-start gap-4 px-4 py-24 md:px-8">
        <p className="text-sm font-semibold text-muted">404</p>
        <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] md:text-[56px]">
          Halaman tidak ditemukan
        </h1>
        <p className="text-muted">Mungkin acaranya sudah dihapus, atau alamatnya salah ketik.</p>
        <ButtonLink href="/" variant="dark">
          Lihat acara
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
