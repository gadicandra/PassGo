import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import NotFoundContent from "./(site)/not-found";

// Alamat yang tidak cocok dengan rute mana pun: tidak melewati layout (site), jadi header & footer dipasang di sini.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundContent />
      <SiteFooter />
    </>
  );
}
