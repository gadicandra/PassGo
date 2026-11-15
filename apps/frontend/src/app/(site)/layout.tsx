import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

// Semua halaman website (katalog, detail, checkout, pesanan, tiket, auth, organizer) masuk grup (site).
// Halaman layar penuh tanpa header, misalnya scanner staff, taruh di luar grup ini.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
