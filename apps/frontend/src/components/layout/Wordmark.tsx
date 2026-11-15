import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logo PassGo dari desain Stitch: "PASSGO" krem di blok oranye dengan takik setengah lingkaran di kanan,
 * seperti sobekan tiket. `notchClass` = warna latar di belakang logo supaya takiknya terlihat berlubang.
 */
export function Wordmark({ className, notchClass = "bg-navy" }: { className?: string; notchClass?: string }) {
  return (
    <Link
      href="/"
      aria-label="PassGo, ke beranda"
      className={cn(
        "relative inline-flex h-10 items-center rounded-l-md bg-brand pl-3.5 pr-6 font-display text-[22px] font-extrabold uppercase tracking-[-0.02em] text-cream",
        className,
      )}
    >
      PassGo
      <span aria-hidden className={cn("absolute -right-[9px] top-1/2 size-[18px] -translate-y-1/2 rounded-full", notchClass)} />
    </Link>
  );
}
