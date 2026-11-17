import { ButtonLink } from "@/components/ui/Button";

export function NotFoundContent() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-start gap-4 px-4 py-24 md:px-8">
      <p className="text-sm font-semibold text-muted">404</p>
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Halaman tidak ditemukan</h1>
      <p className="text-muted">Mungkin acaranya sudah dihapus, atau alamatnya salah ketik.</p>
      <ButtonLink href="/" variant="dark">
        Lihat acara
      </ButtonLink>
    </div>
  );
}
