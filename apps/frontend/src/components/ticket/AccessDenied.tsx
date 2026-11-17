import { ButtonLink } from "@/components/ui/Button";

export function AccessDenied({ message = "Halaman ini tidak tersedia untuk akunmu." }: { message?: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <p className="text-[18px] font-semibold">{message}</p>
      <ButtonLink href="/" variant="dark">
        Ke beranda
      </ButtonLink>
    </div>
  );
}

export function GateSkeleton() {
  return <div className="h-40 animate-pulse rounded-card bg-navy/10" aria-busy aria-label="Memeriksa akses" />;
}
