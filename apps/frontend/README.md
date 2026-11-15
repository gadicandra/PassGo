# PassGo Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4. Satu workspace dengan backend di monorepo ini.

## Menjalankan

```bash
# dari root repo
npm install
cp apps/frontend/.env.example apps/frontend/.env   # isi BACKEND_URL kalau backend bukan di localhost:3000
npm run dev:backend     # http://localhost:3000
npm run dev:frontend    # http://localhost:3001
```

Etalase komponen bersama ada di `http://localhost:3001/dev/komponen` (hapus sebelum pengumpulan).

## Struktur

```
src/
  app/
    layout.tsx            font, ToastProvider (root)
    (site)/layout.tsx     header + footer untuk semua halaman website
    (site)/...            halaman: katalog, events, checkout, orders, tickets, login, organizer
    not-found.tsx         404
    icon.svg              favicon
  components/
    ui/                   Button, Field, Skeleton, Toast        (pemilik: Marcel)
    layout/               SiteHeader, SiteFooter, Wordmark      (pemilik: Marcel)
    event/                Poster, EventCard, TicketStub         (pemilik: Marcel)
  lib/
    format.ts             formatRupiah, formatDate, formatTime, formatDateTime
    status.ts             label & warna status acara/pesanan/tiket
    api/                  API client + auth                     (pemilik: Adi)
  types/api.ts            tipe data sesuai docs/api-contract.md
```

Halaman layar penuh tanpa header (scanner staff) taruh **di luar** `(site)`, misalnya `src/app/scan/[eventId]/page.tsx`.

## Aturan

- **Panggil API lewat path relatif `/api/v1/...`**, bukan URL backend. `next.config.ts` meneruskannya ke backend supaya cookie refresh token (`SameSite=Strict`) tetap jalan di produksi.
- **Warna & font pakai token**, bukan hex: `bg-navy`, `text-brand`, `bg-sun`, `bg-teal`, `bg-cream`, `border-line`, `font-display`, `font-serif`, `font-mono`.
- **Archivo 800 (`font-display font-extrabold`) cukup sekali per halaman** untuk judul utama. Sisanya Hanken Grotesk (default).
- **Satu tombol `primary` (oranye) per halaman.** Yang lain `dark`, `outline`, atau `text`.
- **Tanpa ikon di samping teks, tanpa huruf kapital semua, tanpa pill/badge.** Status cukup kata berwarna dari `lib/status.ts`.
- **Halaman yang memakai `useSearchParams()` harus dibungkus `<Suspense>`**, kalau tidak `npm run build` gagal.
- **Poster pakai `<Poster />`**, jangan `next/image`: URL poster bisa dari Supabase atau `/uploads` backend.
- Komponen di `components/` dan `lib/api` hanya diubah pemiliknya. Butuh perubahan, minta ke pemiliknya.

Sebelum push: `npm run lint --workspace=apps/frontend` dan `npm run typecheck --workspace=apps/frontend`.
