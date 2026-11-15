import { AccountNav } from "./AccountNav";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-navy shadow-[0_2px_12px_rgb(20_33_61/0.18)]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:h-20 md:gap-6 md:px-8">
        <Wordmark />

        <form action="/" role="search" className="hidden max-w-xl flex-1 md:block">
          <label htmlFor="site-search" className="sr-only">
            Cari acara
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            minLength={2}
            placeholder="Cari acara"
            className="h-11 w-full rounded-lg border border-[#2b3c63] bg-[#1b2b4d] px-4 text-[15px] text-cream placeholder:text-cream/50 focus:border-brand focus:outline-none"
          />
        </form>

        <nav aria-label="Akun" className="shrink-0">
          <AccountNav />
        </nav>
      </div>
    </header>
  );
}
