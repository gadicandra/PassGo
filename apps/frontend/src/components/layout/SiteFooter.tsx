import Link from "next/link";
import { Wordmark } from "./Wordmark";

// Kolom tautan hanya ke halaman yang memang ada; halaman yang butuh login akan mengarahkan ke /login.
const columns = [
  {
    title: "Jelajahi",
    links: [
      { href: "/", label: "Semua acara" },
      { href: "/?filter=minggu", label: "Minggu ini" },
      { href: "/?filter=bulan", label: "Bulan ini" },
      { href: "/?filter=gratis", label: "Acara gratis" },
    ],
  },
  {
    title: "Akun",
    links: [
      { href: "/tickets", label: "Tiket saya" },
      { href: "/orders", label: "Pesanan saya" },
      { href: "/profile", label: "Profil" },
      { href: "/register", label: "Daftar" },
    ],
  },
  {
    title: "Penyelenggara",
    links: [
      { href: "/organizer/events", label: "Kelola acara" },
      { href: "/organizer/orders", label: "Pesanan masuk" },
      { href: "/staff", label: "Pindai tiket" },
    ],
  },
];

// Metode yang tampil di Midtrans Snap (tanpa enabled_payments, semua metode bawaan aktif).
const payments = ["QRIS", "GoPay", "ShopeePay", "BCA VA", "BNI VA", "BRI VA", "Mandiri", "Permata VA", "Kartu kredit"];

export function SiteFooter() {
  return (
    <footer className="mt-16 w-full bg-navy text-cream/70">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-8 pt-12 md:grid-cols-12 md:px-8">
        <div className="md:col-span-4">
          <Wordmark />
          <p className="mt-5 max-w-xs text-[15px] leading-relaxed">
            Beli tiket acara komunitas, konser kecil, workshop, dan pameran di sekitarmu. Bayar sekali, tiket QR langsung
            masuk ke akunmu.
          </p>
        </div>

        <nav aria-label="Tautan footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-5">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[15px] font-bold text-cream">{column.title}</h2>
              <ul className="mt-4 flex flex-col gap-3 text-[15px]">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-cream">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="md:col-span-3">
          <h2 className="text-[15px] font-bold text-cream">Pilihan pembayaran</h2>
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {payments.map((method) => (
              <li
                key={method}
                className="flex h-10 items-center justify-center rounded-md border border-cream/15 bg-cream/5 px-1 text-center text-[12px] font-semibold leading-tight text-cream/90"
              >
                {method}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px]">Pembayaran diproses aman oleh Midtrans.</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="flex flex-col gap-2 border-t border-dashed border-cream/20 py-6 text-[13px] md:flex-row md:justify-between">
          <p>© 2026 PassGo · Kelompok 10 PAW UGM</p>
          <p>Harga dalam Rupiah, waktu dalam WIB.</p>
        </div>
      </div>
    </footer>
  );
}
