import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NotFoundContent } from "@/components/layout/NotFoundContent";

// URL yang tidak cocok dengan route mana pun: dirender tanpa layout (site), jadi bawa header/main/footer sendiri.
// notFound() di dalam (site) memakai (site)/not-found.tsx agar landmark tidak dobel.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
