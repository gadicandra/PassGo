"use client";

import { Button } from "@/components/ui/Button";

// Batas error untuk semua halaman di (site): backend mati, jaringan putus, dsb.
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 px-4 py-24 md:px-8">
      <h1 className="text-[30px] font-bold leading-tight tracking-[-0.01em] md:text-[36px]">
        Gagal memuat halaman
      </h1>
      <p className="text-muted">Server sedang tidak bisa dihubungi. Coba lagi sebentar.</p>
      <Button variant="dark" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
