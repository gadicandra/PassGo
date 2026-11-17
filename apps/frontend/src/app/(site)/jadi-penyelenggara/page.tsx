import type { Metadata } from "next";
import { OrganizerSignup } from "./OrganizerSignup";

export const metadata: Metadata = { title: "Jadi penyelenggara" };

const steps = [
  ["Ajukan", "Isi nama komunitas dan acara yang akan dibuat."],
  ["Ditinjau", "Penyelenggara PassGo memeriksa pengajuan Anda."],
  ["Buat acara", "Setelah disetujui, muat ulang halaman lalu buat acara pertama."],
];

const reasons = [
  ["Tanpa komisi platform", "Pembayaran QRIS, e-wallet, dan transfer bank lewat Midtrans langsung tercatat lunas."],
  ["Kuota terkunci otomatis", "Tiket tidak pernah terjual melebihi kapasitas tempat."],
  ["Pindai dari HP", "Panitia cukup membuka web di ponsel untuk check-in di pintu masuk."],
];

export default function OrganizerSignupPage() {
  return (
    <section className="mx-auto grid grid-cols-1 w-full max-w-[1200px] gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1fr_440px] lg:gap-16">
      <div>
        <h1 className="font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[56px]">Jual tiket acaramu di PassGo</h1>
        <p className="mt-5 max-w-xl text-[17px] text-navy/75">
          Untuk komunitas yang mengadakan lokakarya, pameran, diskusi, atau pertunjukan kecil. Daftarkan diri sebagai penyelenggara, lalu kelola acara, tiket, panitia, dan peserta dari satu tempat.
        </p>
        <dl className="mt-10 divide-y divide-line border-y border-line">
          {reasons.map(([title, body]) => (
            <div key={title} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
              <dt className="font-semibold">{title}</dt>
              <dd className="text-navy/75">{body}</dd>
            </div>
          ))}
        </dl>
        <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map(([title, body], index) => (
            <li key={title}>
              <p className="text-[28px] font-bold leading-none text-brand">{index + 1}</p>
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-navy/70">{body}</p>
            </li>
          ))}
        </ol>
      </div>
      <OrganizerSignup />
    </section>
  );
}
