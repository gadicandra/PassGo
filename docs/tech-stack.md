# Justifikasi Tech Stack PassGo

Dokumen ini menjelaskan **setiap teknologi dan library** yang dipakai PassGo, **di mana dipakai**, **mengapa
dipilih**, dan **alternatif yang dipertimbangkan**. Daftar library diambil dari `package.json` yang terpasang
(bukan dari rencana), dan lokasi pemakaian dicek langsung di kode.

Prinsip pemilihan yang dipakai tim:

1. **Kebutuhan dulu, alat kemudian.** Tiga kebutuhan inti US3 (kuota tidak boleh terlampaui, kode tiket unik,
   tiga peran) menentukan pilihan basis data, cara kunci kuota, dan model otorisasi.
2. **Satu bahasa di seluruh stack.** TypeScript di frontend dan backend: satu cara berpikir, tipe data API bisa
   disamakan, dan semua anggota tim bisa membaca kode satu sama lain.
3. **Pakai fitur bawaan sebelum menambah library.** Bila Node.js, Express, MongoDB, atau browser sudah menyediakan,
   tidak ditambah dependency. Contoh: UUID v7, verifikasi ID token Google, dan pemindaian QR memakai API bawaan.
4. **Library yang dipelihara aktif dan banyak dipakai**, agar dokumentasi dan solusi masalahnya mudah dicari.
5. **Gratis untuk skala proyek**: semua layanan pihak ketiga punya tier gratis atau sandbox.

---

## Ringkasan

| Lapisan | Pilihan | Alasan singkat |
|---|---|---|
| Bahasa | TypeScript | Satu bahasa FE + BE, tipe ditangkap saat kompilasi |
| Runtime | Node.js 22 LTS | Dukungan jangka panjang, `fetch`/`crypto`/test runner bawaan |
| Frontend | Next.js 16 + React 19 | Routing berbasis folder, SSR untuk katalog, proxy API bawaan |
| Styling | Tailwind CSS 4 | Token desain di satu tempat, tanpa berkas CSS per komponen |
| Backend | Express 5 | Minimal, paling banyak dipakai, async error ditangani bawaan |
| Validasi | Zod 4 | Satu skema = validasi runtime + tipe TypeScript |
| Basis data | MongoDB Atlas + Mongoose | Transaksi multi-dokumen, dokumen bersarang, gratis di Atlas |
| Autentikasi | JWT + refresh token di cookie HttpOnly | Token pendek tanpa tabel sesi, tetap bisa dicabut |
| Pembayaran | Midtrans Snap | Payment gateway Indonesia, QRIS/e-wallet/VA, sandbox gratis |
| Email | Nodemailer + outbox | SMTP apa saja, tahan gangguan lewat antrean |
| Penyimpanan berkas | Supabase Storage + sharp | Tier gratis, URL publik, poster dikompres ke WebP |
| Deploy | Azure App Service + GitHub Actions | Server berjalan terus (job berkala), deploy otomatis |
| Pengujian | node:test + supertest, Postman/Newman, Playwright | Runner bawaan, uji API nyata, uji browser |

---

## 1. Bahasa & runtime

### TypeScript (backend `^7.0.2`, frontend `^5`)
**Dipakai:** seluruh kode backend dan frontend.
**Alasan:**
- Kesalahan seperti salah nama field atau `null` yang lupa dicek tertangkap **saat kompilasi**, bukan saat demo.
- Tipe data API ditulis sekali di `apps/frontend/src/types/api.ts` mengikuti kontrak; bila kontrak berubah,
  semua halaman yang terdampak langsung error.
- Empat orang mengerjakan bagian berbeda; tipe menjadi "dokumentasi yang dicek otomatis".

**Alternatif:** JavaScript biasa. Ditolak karena bug tipe baru ketahuan saat runtime.
Versi berbeda (7 di backend, 5 di frontend) karena frontend mengikuti versi yang didukung Next.js 16.

### Node.js ≥ 22.18 (LTS)
**Dipakai:** runtime backend, build frontend, skrip seed.
**Alasan:**
- Versi **LTS** (dukungan keamanan jangka panjang), tersedia di Azure App Service sebagai `NODE:22-lts`.
- Fitur bawaan yang mengurangi dependency: `fetch` (memanggil Google & Midtrans), `node:crypto`
  (`randomBytes`, `createHash`, `timingSafeEqual`), `node:test` (test runner), `--env-file`.

### npm workspaces (monorepo)
**Dipakai:** root `package.json` mengelola `apps/backend` dan `apps/frontend`.
**Alasan:** satu `npm install`, satu `package-lock.json`, satu repo untuk PR dan CI. Tidak perlu alat monorepo
tambahan (Turborepo, Nx) untuk dua aplikasi.

---

## 2. Frontend

### Next.js 16 (App Router)
**Dipakai:** seluruh aplikasi web (`apps/frontend`).
**Alasan:**
- **Routing berbasis folder** dan **route group** `(site)`: halaman biasa berbagi header/footer, sedangkan layar
  pemindai `/scan/[eventId]` tampil layar penuh tanpa layout yang sama.
- **Server Component** untuk katalog dan detail acara: HTML sudah berisi data acara saat dikirim, jadi cepat
  tampil dan bisa diindeks mesin pencari.
- **`rewrites` bawaan** meneruskan `/api/v1/*` ke backend. Browser hanya melihat satu origin, sehingga cookie
  refresh `SameSite=Strict` bisa dipakai (lihat bagian Keamanan). Tanpa ini perlu CORS lintas-domain dan cookie
  `SameSite=None` yang lebih rentan.
- **`output: "standalone"`** menghasilkan paket server mandiri yang bisa dijalankan dengan `node server.js` di
  Azure tanpa `npm install` di server.
- Header keamanan (CSP, X-Frame-Options) diatur langsung di `next.config.ts`.

**Alternatif:** React + Vite (SPA). Ditolak karena perlu router, proxy dev, dan konfigurasi SSR sendiri, dan
katalog akan kosong sampai JavaScript selesai dimuat.

### React 19
**Dipakai:** semua komponen UI.
**Alasan:** standar industri, dibutuhkan Next.js 16. Fitur yang dipakai: `use()` untuk membaca `searchParams` di
halaman klien, `useId` untuk id input unik (aksesibilitas label), hooks untuk state form.

### Tailwind CSS 4 (+ `@tailwindcss/turbopack`)
**Dipakai:** seluruh styling; token desain di `src/app/globals.css` (`@theme`).
**Alasan:**
- **Token desain di satu tempat** (`--color-navy`, `--color-brand`, radius, bayangan) dipakai sebagai kelas
  (`bg-navy`, `text-brand`). Mengganti warna brand cukup di satu baris.
- Tidak perlu memberi nama kelas CSS dan membuka dua berkas untuk satu komponen.
- Hanya kelas yang dipakai yang masuk ke CSS akhir, jadi berkas CSS kecil.
- `@tailwindcss/turbopack` adalah loader resmi agar Tailwind 4 bekerja dengan bundler Turbopack di Next 16.

**Alternatif:** CSS Modules / styled-components. Ditolak karena token desain tersebar dan lebih banyak berkas.

### lucide-react
**Dipakai:** ikon di 22 komponen (cari, kalender, lokasi, panah, menu akun).
**Alasan:** ikon SVG yang di-*tree-shake* (hanya ikon yang dipakai masuk bundle), gaya garis konsisten, lisensi
ISC. Lebih ringan daripada font ikon.

### qrcode (frontend)
**Dipakai:** `components/ticket/TicketQr.tsx`, menggambar QR e-tiket di halaman tiket.
**Alasan:** QR dibuat **di browser** dari payload `PASSGO1:<kode>`, jadi tidak ada gambar tiket yang disimpan
di server dan tidak ada request tambahan.

### jsQR
**Dipakai:** `components/checkin/QrCamera.tsx`, membaca QR dari kamera HP panitia.
**Alasan:**
- Panitia cukup membuka web di HP, **tanpa memasang aplikasi**.
- `BarcodeDetector` bawaan browser belum didukung Safari/iOS; jsQR berjalan di semua browser modern dengan
  membaca piksel dari `<video>` kamera.
- Murni JavaScript, tanpa WebAssembly atau server.

### ESLint 9 + eslint-config-next
**Dipakai:** `npm run lint` di frontend, dijalankan juga di CI sebelum deploy.
**Alasan:** aturan resmi Next/React (hooks dipakai benar, gambar, link) menangkap bug sebelum review.

---

## 3. Backend

### Express 5
**Dipakai:** framework HTTP backend (`apps/backend/src/app.ts`, `routes/`).
**Alasan:**
- Framework Node.js **paling banyak dipakai**: dokumentasi, middleware, dan contoh paling banyak.
- **Versi 5** menangani error dari fungsi `async` secara bawaan, jadi tidak perlu wrapper `asyncHandler` di
  setiap route.
- Minimal: struktur ditentukan tim (`routes → services → models`), tidak dipaksa framework.
- App diekspor tanpa `listen()`, sehingga bisa diuji langsung dengan supertest dan dipakai ulang untuk Vercel
  (`server.ts`) maupun server biasa (`src/index.ts`).

**Alternatif:** NestJS (terlalu banyak konvensi dan boilerplate untuk tim 4 orang dalam satu semester),
Fastify (lebih cepat, tapi ekosistem dan pengalaman tim lebih kecil; kecepatan bukan masalah di skala komunitas).

### Zod 4
**Dipakai:** validasi **semua** input di route (body, query, params), field bersama di
`validators/user-fields.ts` (password, nomor HP), dan pesan error Bahasa Indonesia di `validators/zod-locale.ts`.
**Alasan:**
- **Satu skema menghasilkan dua hal**: validasi saat runtime dan tipe TypeScript (`z.infer`). Tidak ada
  duplikasi antara "aturan validasi" dan "tipe data".
- **`.strict()`** menolak field yang tidak dikenal dengan `422`. Ini mencegah *mass assignment*, misalnya peserta
  mengirim `role: "ORGANIZER"` atau `price: 0` saat mendaftar atau memesan.
- **Transformasi** dalam skema: nomor HP `0812…` dinormalisasi menjadi `+62812…`, email di-*lowercase*,
  string di-*trim*.
- Error Zod dipetakan otomatis ke format RFC 9457 dengan `errors[].pointer` (`#/email`), sehingga form frontend
  bisa menampilkan pesan tepat di bawah field yang salah.
- Locale `id` bawaan Zod 4 + pesan ringkas: pengguna melihat "Minimal 8 karakter.", bukan pesan Inggris.

**Alternatif:** Joi (tidak menghasilkan tipe TypeScript), express-validator (validasi tersebar di rantai
middleware, tipe tetap ditulis manual), class-validator (butuh class + decorator).

### MongoDB Atlas
**Dipakai:** basis data utama (13 koleksi).
**Alasan:**
- **Transaksi multi-dokumen** (butuh replica set; Atlas gratis sudah replica set). Dipakai untuk alur yang tidak
  boleh setengah jadi: membuat pesanan + memotong kuota, pembayaran lunas + menerbitkan tiket.
- **Operasi atomik bersyarat** (`findOneAndUpdate` dengan `$expr: soldCount + reservedCount + qty <= quota`)
  adalah inti jaminan "kuota tidak pernah terlampaui". Dua pembeli tiket terakhir tidak bisa sama-sama berhasil.
- **Dokumen bersarang**: item pesanan disimpan di dalam pesanan (`Order.items`), jadi membaca pesanan tidak
  perlu join.
- **TTL index** menghapus otomatis data sementara (kunci idempotensi 24 jam, token verifikasi).
- **Atlas M0 gratis**, terkelola (backup, monitoring), bisa diakses dari Azure dan laptop.

**Alternatif:** PostgreSQL + Prisma. Sama-sama layak; dipilih MongoDB karena skema dokumen fleksibel selama
desain masih berubah dan tim lebih familier. Tradeoff yang disadari: tidak ada `CHECK` constraint di level DB,
jadi invariant kuota dijaga di aplikasi lewat update atomik + validator Mongoose (lihat ADR #12 di
`architecture.md`).

### Mongoose 8
**Dipakai:** model di `src/models/` (18 berkas memakainya), sesi transaksi di service.
**Alasan:** skema dan validator di satu tempat (mis. `soldCount` tidak boleh negatif sebagai pertahanan kedua),
index didefinisikan di kode, dukungan transaksi (`session.withTransaction`), dan tipe TypeScript.
**Alternatif:** driver `mongodb` langsung. Ditolak karena validasi dan index harus ditulis manual.

### jsonwebtoken
**Dipakai:** membuat & memverifikasi access token (`lib/auth-tokens.ts`, `middlewares/authenticate.ts`),
memverifikasi ID token Google (`lib/google-id-token.ts`).
**Alasan:**
- Access token **berumur pendek (15 menit)** dan *stateless*: middleware tidak perlu tabel sesi.
- Verifikasi dipin ketat: `algorithms: ["HS256"]`, `issuer`, `audience`, dan `typ: at+jwt` dicek manual
  (mencegah token jenis lain diterima, RFC 8725).
- Dipakai ulang untuk memverifikasi ID token Google (RS256) dengan kunci publik Google, **tanpa library Google
  tambahan**.
- Agar tetap bisa dicabut, setiap request membaca `tokenVersion` pengguna dari DB; menonaktifkan akun atau
  logout semua perangkat langsung berlaku.

**Alternatif:** session di database (setiap request baca sesi), Passport.js (lapisan abstraksi yang tidak perlu
untuk satu strategi).

### bcryptjs
**Dipakai:** hash password (`services/auth-service.ts`, `services/user-service.ts`), cost 12.
**Alasan:** bcrypt adalah algoritma hash password yang sengaja lambat dan ber-*salt*, standar industri.
Versi `bcryptjs` murni JavaScript: tidak perlu kompilasi native, jadi aman di build GitHub Actions dan Azure.
Batas 72 byte bcrypt dijaga oleh validasi Zod (password > 72 byte UTF-8 ditolak).
**Alternatif:** `bcrypt` (native, perlu toolchain build), argon2 (lebih modern, tapi native dan tidak perlu di
skala ini).

### cookie-parser
**Dipakai:** `routes/auth.ts`, membaca cookie `__Secure-refresh_token` di `/auth/refresh` dan `/auth/logout`.
**Alasan:** refresh token **tidak boleh** bisa dibaca JavaScript (mencegah pencurian lewat XSS), jadi disimpan
di cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. Express tidak mem-parse cookie secara bawaan.
Hanya dipasang di router auth, bukan global.

### cors
**Dipakai:** `app.ts`, origin dari `CORS_ORIGIN`.
**Alasan:** di produksi browser memanggil API lewat proxy Next (satu origin), tapi CORS tetap dikonfigurasi
dengan **allowlist** (bukan `*`) untuk pengembangan dan klien lain seperti Postman yang menembak backend langsung.

### helmet
**Dipakai:** `app.ts`, header keamanan API.
**Alasan:** satu baris memasang belasan header aman (`X-Content-Type-Options`, `Strict-Transport-Security`,
`X-Frame-Options`, dll.) sesuai rekomendasi OWASP.

### express-rate-limit
**Dipakai:** `middlewares/rate-limit.ts`, kebijakan sesuai kontrak §7.
**Alasan:**
- Mencegah **brute force password** (login 5×/15 menit per IP+email dan 20×/15 menit per IP), spam email lewat
  daftar/lupa password (3×/jam), dan penyalahgunaan refresh.
- Mendukung header standar IETF `draft-8` (`RateLimit`, `RateLimit-Policy`) dan `ipKeyGenerator` yang
  mengelompokkan IPv6 per /56 agar tidak bisa dihindari dengan berganti alamat.
- 429 dikirim lewat error handler yang sama, jadi formatnya tetap problem+json.

**Tradeoff:** hitungan disimpan di memori proses; cukup untuk satu instance Azure B1. Bila di-*scale out*,
perlu store bersama (Redis/Mongo).

### multer
**Dipakai:** `routes/events.ts`, upload poster `PUT /events/:eventId/poster`.
**Alasan:** standar untuk `multipart/form-data` di Express. Dikonfigurasi ketat: **memory storage** (berkas tidak
pernah ditulis ke disk mentah), maksimal **2 MB**, tepat **satu berkas**, tanpa field lain.

### sharp
**Dipakai:** `services/event-service.ts`, memproses poster sebelum disimpan.
**Alasan:**
- **Memeriksa isi berkas, bukan nama/MIME dari klien**: `sharp().metadata()` membaca format asli; selain
  JPEG/PNG/WebP ditolak `415`. Berkas berbahaya yang menyamar sebagai gambar tidak lolos.
- **Re-encode ke WebP** (kualitas 82): ukuran turun drastis, dan sekaligus **membuang metadata EXIF termasuk
  lokasi GPS** serta payload yang disisipkan.
- Memvalidasi ukuran minimal poster.
- Library pemrosesan gambar paling cepat di Node (libvips).

### @supabase/supabase-js
**Dipakai:** `lib/storage.ts`, menyimpan poster ke Supabase Storage.
**Alasan:** Azure App Service dan Vercel punya disk sementara; poster harus di penyimpanan objek agar tidak
hilang saat redeploy. Supabase Storage punya **tier gratis**, URL publik langsung, dan SDK resmi.
Tanpa kredensial Supabase, poster otomatis disimpan di disk lokal (`uploads/`) untuk pengembangan.
**Alternatif:** AWS S3 / Azure Blob (perlu akun berbayar dan konfigurasi IAM), Cloudinary.

### midtrans-client (+ `@types/midtrans-client`)
**Dipakai:** `lib/midtrans.ts`, `services/order-service.ts`: membuat transaksi Snap dan mengecek status.
**Alasan:**
- **Payment gateway Indonesia** dengan QRIS, GoPay, ShopeePay, virtual account bank, dan kartu.
- **Snap** menyediakan halaman pembayaran siap pakai (popup), jadi tidak perlu membangun UI tiap metode bayar.
- **Sandbox gratis** dan bisa dipakai akun perorangan, tanpa verifikasi badan usaha untuk demo.
- Webhook bertanda tangan SHA-512 diverifikasi dengan `timingSafeEqual` dari `node:crypto`, dan nominalnya
  dicocokkan dengan total pesanan sebelum pesanan dianggap lunas. Status juga bisa dicek ulang ke API Midtrans
  lewat `POST /orders/:orderId/payment/sync` bila webhook terlambat.

**Alternatif:** Xendit (aktivasi lebih cepat, tapi kode sudah dibangun di atas Snap), Core API Midtrans (perlu
UI per metode bayar sendiri).

### nodemailer
**Dipakai:** `services/email-service.ts`, `services/email-templates.ts`: verifikasi email, reset password,
e-tiket, pemberitahuan pembatalan/refund.
**Alasan:** library email paling umum di Node, mendukung **SMTP apa saja** (Gmail, Brevo, Mailpit lokal) tanpa
terkunci ke satu vendor, dan bisa melampirkan gambar QR inline (`cid:`).
**Pola outbox:** email tidak dikirim langsung saat request. Baris email disimpan di koleksi `EmailOutbox`
dalam transaksi yang sama, lalu dikirim setelah request dan oleh job berkala dengan percobaan ulang. Webhook
pembayaran tetap cepat, dan email tidak hilang walau SMTP sedang gangguan.

### qrcode (backend)
**Dipakai:** `services/email-templates.ts`, menggambar QR sebagai PNG di dalam email e-tiket.
**Alasan:** email tidak bisa menjalankan JavaScript, jadi QR harus berupa gambar yang dibuat di server.
Library yang sama dengan frontend, jadi QR di email dan di web identik.

### exceljs
**Dipakai:** `services/attendee-service.ts`, ekspor daftar peserta ke `.xlsx`.
**Alasan:** panitia memakai Excel/Google Sheets untuk daftar hadir cadangan. ExcelJS menulis XLSX asli (header,
lebar kolom), murni JavaScript tanpa dependensi native. CSV dibuat tanpa library (dengan BOM UTF-8 agar Excel
membaca huruf non-ASCII dengan benar dan sel di-*escape* untuk mencegah formula injection).

### dotenv
**Dipakai:** `src/index.ts`, memuat `.env` saat pengembangan.
**Alasan:** konfigurasi dan secret lewat environment variable (prinsip 12-factor), tidak pernah di kode.
Skrip npm juga memakai flag bawaan Node `--env-file-if-exists=.env`; dotenv tetap dipakai sebagai cadangan.

### Fitur Node bawaan yang menggantikan library
| Kebutuhan | Dipakai | Bukan |
|---|---|---|
| ID UUID v7 | `utils/uuid.ts` (16 baris, `node:crypto`) | paket `uuid` |
| Kode tiket acak (Crockford base32) | `utils/ticket-code.ts` (`randomBytes`) | paket nanoid |
| Verifikasi ID token Google | `lib/google-id-token.ts` (`fetch` JWKS + `jsonwebtoken`) | `google-auth-library` |
| Perbandingan aman tanda tangan / secret | `crypto.timingSafeEqual` | — |
| Memanggil API Google & Midtrans | `fetch` bawaan | axios |
| Test runner | `node:test`, `node:assert/strict` | Jest, Mocha |

**UUID v7** dipilih (bukan ObjectId MongoDB atau UUID v4) karena tidak bisa ditebak, **terurut waktu** (pagination
berbasis cursor cukup memakai ID), dan standar (RFC 9562).

### Dependency yang terpasang tapi tidak dipakai
| Paket | Status |
|---|---|
| `pino`, `pino-http`, `pino-pretty` | Disiapkan untuk log terstruktur, belum dipasang di kode (log memakai `console`) |
| `file-type` | Digantikan `sharp().metadata()` yang sekaligus memvalidasi isi gambar |
| `nodemon` | Digantikan `tsx watch` di skrip `dev` |

Kandidat untuk dihapus dari `package.json` agar instalasi lebih ringan.

---

## 4. Tooling pengembangan & pengujian

| Alat | Dipakai untuk | Alasan |
|---|---|---|
| **tsx** | Menjalankan TypeScript langsung (`dev`, test, skrip seed) | Tanpa langkah build saat pengembangan; `tsx watch` me-reload otomatis |
| **node:test** + **node:assert/strict** | Unit & integration test backend (67+ test) | Bawaan Node, tanpa konfigurasi Jest |
| **supertest** | Menguji route HTTP terhadap app Express | Tanpa membuka port; app diekspor tanpa `listen()` |
| **Postman + Newman** | 87 request end-to-end (`postman/`) | Menguji API nyata, bisa dijalankan ke lokal atau produksi (`npm run test:api`) |
| **Playwright** | QA browser di website produksi | Menguji alur nyata (login, refresh sesi, checkout) termasuk kondisi balapan |
| **ESLint** | Lint frontend | Aturan resmi Next/React |
| **@types/*** | Tipe untuk library JavaScript (express, multer, cookie-parser, cors, jsonwebtoken, qrcode, supertest, react) | Agar seluruh kode tetap bertipe |

---

## 5. Infrastruktur & layanan

### Azure App Service (Linux, Node 22)
**Dipakai:** dua Web App (`passgo-web`, `passgo-api`) dalam satu plan B1.
**Alasan:**
- **Proses berjalan terus**, bukan fungsi serverless. Job berkala (kedaluwarsa pesanan, kirim email) jalan di
  dalam server tanpa cron eksternal, dan rate limit di memori bekerja konsisten.
- **Azure for Students** memberi kredit gratis.
- Memenuhi rubrik nilai tambah "deploy selain Vercel".

**Alternatif:** Vercel (masih didukung lewat `server.ts` + `vercel.json`, tapi cron Hobby hanya sekali sehari dan
edge-nya menolak header `If-Match`), Railway/Render (domain berbeda dari frontend sehingga cookie lintas-site).

### GitHub Actions
**Dipakai:** `.github/workflows/deploy-backend.yml`, `deploy-frontend.yml`.
**Alasan:** setiap push ke `main` otomatis menjalankan **typecheck + test (backend)** dan **lint + typecheck
(frontend)**, lalu build dan deploy. Kode yang gagal tes tidak pernah sampai ke produksi. Gratis untuk repo publik.

### MongoDB Atlas, Supabase, Midtrans, Google Identity Services, SMTP
Semua dipakai pada **tier gratis atau sandbox**. Alasan masing-masing ada di bagian Backend di atas.
Google Identity Services dipakai untuk login "Lanjutkan dengan Google": peserta tidak perlu membuat password baru,
dan email dari Google sudah terverifikasi.

---

## 6. Keputusan arsitektur yang memengaruhi pemilihan library

| Keputusan | Dampak pada stack |
|---|---|
| Kuota direservasi atomik saat pesan | Butuh DB dengan update atomik bersyarat + transaksi → MongoDB replica set + Mongoose sessions |
| Browser hanya bicara ke frontend | Next.js `rewrites`; cookie `SameSite=Strict` → `cookie-parser` di backend |
| Access token di memori, refresh di cookie HttpOnly | `jsonwebtoken` + `cookie-parser`; tidak ada `localStorage` |
| Semua input divalidasi ketat | Zod `.strict()` di setiap route |
| Email tidak boleh hilang | Pola outbox di MongoDB + `nodemailer` |
| Poster tidak boleh berbahaya | `multer` (batas ukuran) + `sharp` (cek isi + re-encode) |
| Error konsisten untuk FE | RFC 9457 problem+json, error Zod dipetakan per field |
| Concurrency edit | Field `version` + `If-Match` (tanpa library) |
| Pemindai tanpa aplikasi | `jsQR` + kamera browser |

Detail keputusan dan tradeoff: [`architecture.md`](architecture.md) §15 (ADR).
