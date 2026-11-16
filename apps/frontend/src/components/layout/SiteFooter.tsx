import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-16 w-full bg-navy text-cream/70">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-4 py-8 md:flex-row md:px-8">
        <Wordmark />
        <nav className="flex items-center gap-8 text-[15px]">
          <Link href="/" className="hover:text-cream">
            Acara
          </Link>
          <Link href="/tickets" className="hover:text-cream">
            Tiket saya
          </Link>
        </nav>
        <p className="text-[14px]">QRIS · GoPay · ShopeePay · Virtual Account</p>
      </div>
    </footer>
  );
}
