import { AccountMenu } from "./AccountMenu";
import { SearchBox } from "./SearchBox";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-navy shadow-[0_2px_12px_rgb(20_33_61/0.18)]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:h-20 md:gap-6 md:px-8">
        <Wordmark />

        <SearchBox />

        <nav className="flex shrink-0 items-center gap-3 md:gap-5">
          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}
