import { OrganizerNav } from "./OrganizerNav";

// Navigasi bersama halaman organizer. Acara = Debert, Pesanan = Marcel, Pengguna & Log audit = Adi.
export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  return (
    <>
      <OrganizerNav />
      {children}
    </>
  );
}
