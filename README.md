# PassGo — Tiket dan Check-in Acara Komunitas

PassGo adalah aplikasi web untuk menjual tiket dan melakukan check-in pada acara komunitas kecil, seperti lokakarya, pameran, diskusi, dan pertunjukan. Aplikasi ini menggantikan alur lama yang masih manual: peserta mengisi formulir, mentransfer ke rekening panitia, lalu mengirim bukti transfer lewat chat. Di PassGo, pembayaran tercatat otomatis, kuota tidak pernah terlampaui, setiap tiket memiliki kode QR unik, dan panitia cukup memakai ponsel untuk memindai tiket di pintu masuk.

Proyek Akhir Pemrograman Aplikasi Web 2026/2027, **Kelompok 10**, kategori **US3 Pengembangan Sistem Baru**, mode reguler.

## Tautan

| | Tautan |
|---|---|
| Aplikasi web | **[https://passgo-web.azurewebsites.net](https://passgo-web.azurewebsites.net)** |
| Video presentasi dan demo | **[Google Drive](https://drive.google.com/drive/folders/1KIRrBomNauZgTGaiy5gFKrr69euTYxCj)** |
| API (health check) | [https://passgo-api.azurewebsites.net/api/v1/health](https://passgo-api.azurewebsites.net/api/v1/health) |
| Repositori | [https://github.com/gadicandra/PassGo](https://github.com/gadicandra/PassGo) |

## Anggota dan Pembagian Tugas

| Nama | NIM | Milestone 1 (Backend) | Milestone 2 (Frontend) |
|---|---|---|---|
| Marcelinus Dinoglide Yoga Prakoso | 24/533842/TK/59152 | Koleksi Postman, unggah poster, pagination, ID UUIDv7 | Kerangka Next.js dan komponen, katalog, detail acara, checkout Midtrans, pesanan dan refund |
| Garjita Adicandra | 24/535330/TK/59377 | Ide, arsitektur, kontrak API, email outbox, deployment | Login, daftar, login Google, profil, pengguna, log audit, deploy Azure dan CI/CD |
| Rasyid Rayhan Novandy | 24/545518/TK/60688 | Model Mongoose, error handler, validasi, seed | Tiket saya dan QR, pemindai, peserta, laporan kehadiran, ekspor XLSX |
| Debert Jamie Chanderson | 24/540062/TK/59896 | Monorepo, autentikasi, pesanan, kuota, pembayaran, tiket | Kelola acara, tipe tiket, poster, penugasan panitia, video demo |

Setiap bagian dikerjakan di branch fitur (`fe/beli`, `fe/auth`, `fe/tiket`, `fe/kelola-acara`), digabung ke `staging` lewat pull request, lalu ke `main` yang otomatis dideploy ke Azure.

## Latar Belakang

Panitia acara komunitas kecil umumnya menjual tiket lewat Google Form, transfer bank, dan konfirmasi di chat. Cara ini menimbulkan tiga masalah:

1. **Pembayaran manual.** Panitia memeriksa bukti transfer satu per satu.
2. **Kuota sulit dijaga.** Rekap di spreadsheet membuat tiket bisa terjual melebihi kapasitas tempat.
3. **Tiket mudah dipalsukan.** Tiket berupa gambar atau nama di daftar sulit diperiksa keasliannya di pintu masuk.

Platform besar seperti Loket, GOERS, dan Eventbrite memungut komisi dan dirancang untuk acara besar. PassGo menyediakan fitur inti yang dibutuhkan panitia kecil, tanpa komisi platform.

## Kesesuaian dengan User Story US3

| Ketentuan US3 | Penerapan di PassGo |
|---|---|
| Data acara: judul, tanggal, lokasi, deskripsi, poster | Acara disimpan sebagai draf, dilengkapi poster, lalu diterbitkan |
| Beberapa tipe tiket (Presale, Reguler, VIP) | Harga, kuota, masa jual, dan batas per pesanan diatur per tipe |
| Kuota berkurang otomatis dan tidak boleh terlampaui | Sisa kuota diperiksa dan dipotong dalam satu transaksi basis data |
| Kode unik berupa QR untuk validasi | Setiap tiket punya kode acak, dan satu tiket hanya bisa dipakai masuk sekali |
| Tiga peran dengan hak akses berbeda | Diperiksa di API dan di halaman, panitia hanya melihat acara yang ditugaskan |

## Fitur

**Peserta**
- Katalog acara dengan kategori, filter waktu dan harga, pencarian, serta agenda per tanggal
- Detail acara dengan pilihan tipe tiket, sisa kuota, simpan acara, tambah ke kalender, dan bagikan
- Checkout dan pembayaran lewat Midtrans (QRIS, e-wallet, virtual account, kartu) dengan batas bayar 30 menit
- E-tiket ber-QR di akun dan dikirim ke email, nama pemegang tiket dapat diubah sebelum check-in dibuka
- Daftar pesanan dengan hitung mundur pembayaran
- Pengajuan diri menjadi penyelenggara dari halaman **Jadi Penyelenggara**

**Panitia**
- Hanya melihat acara yang ditugaskan
- Memindai QR lewat kamera ponsel atau mengetik 16 karakter kode tiket
- Enam hasil pindai yang berbeda: diterima, sudah dipakai, di luar jam check-in, tidak berlaku, tiket acara lain, dan kode tidak dikenal
- Pemindaian bersifat atomik, sehingga satu tiket tidak bisa dipakai masuk dua kali walaupun dipindai bersamaan

**Penyelenggara**
- Membuat, mengubah, menerbitkan, dan membatalkan acara, termasuk unggah poster
- Mengatur tipe tiket dan kuota, serta menugaskan panitia
- Daftar peserta dengan pencarian, check-in manual, batal check-in dengan alasan, dan ekspor CSV atau XLSX
- Laporan penjualan dan kehadiran, daftar pesanan, dan pencatatan pengembalian dana
- Mengelola akun panitia dan penyelenggara, serta melihat log audit

**Superadmin**
- Penyelenggara dengan penanda superadmin meninjau pengajuan penyelenggara baru di halaman **Permintaan**, lalu menyetujui atau menolak dengan catatan

## Peran dan Hak Akses (RBAC)

| Peran | Cara akun dibuat | Hak akses |
|---|---|---|
| Tamu | Tanpa akun | Melihat katalog dan detail acara |
| Peserta (`ATTENDEE`) | Mendaftar sendiri dengan email atau akun Google | Membeli tiket, melihat pesanan dan tiket miliknya sendiri, mengajukan diri menjadi penyelenggara |
| Panitia (`STAFF`) | Dibuat oleh penyelenggara | Memindai dan melihat peserta hanya untuk acara yang ditugaskan |
| Penyelenggara (`ORGANIZER`) | Akun pertama dari seed, berikutnya disetujui superadmin atau dibuat penyelenggara lain | Mengelola acara, tiket, panitia, pengguna, pesanan, laporan, dan log audit |
| Superadmin | Penanda pada akun penyelenggara, hanya diatur lewat skrip server | Meninjau dan memutuskan pengajuan penyelenggara |

Peran dibaca dari basis data pada setiap permintaan, bukan dari token. Data milik pengguna lain dijawab `404`, bukan `403`, supaya keberadaannya tidak bocor. Penyelenggara tidak dapat mengubah peran dirinya sendiri, dan penyelenggara aktif terakhir tidak dapat dinonaktifkan.

## Nilai Tambah (Integrasi Pihak Ketiga)

- **Payment gateway:** Midtrans Snap, dengan webhook yang tanda tangannya diverifikasi
- **Email otomatis:** e-tiket, verifikasi akun, reset password, dan kabar pembatalan acara, lewat antrean email (outbox) agar tidak hilang saat SMTP gangguan
- **Login dengan akun Google (OAuth2)**
- **Deployment selain Vercel:** frontend dan backend di Azure App Service, dideploy otomatis oleh GitHub Actions

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js 22, Express 5, TypeScript, Zod, JWT, bcrypt |
| Basis data | MongoDB Atlas dan Mongoose (replica set, transaksi untuk kuota dan check-in) |
| Pembayaran | Midtrans Snap (sandbox) |
| Email | Nodemailer dengan outbox |
| Penyimpanan berkas | Supabase Storage, poster diubah ke WebP dengan sharp |
| Tiket dan ekspor | qrcode, jsQR, ExcelJS |
| Deployment | Azure App Service dan GitHub Actions |
| Pengujian | node:test dan supertest, Postman dan Newman |

## Arsitektur

```
Browser (HP atau laptop)
   │  HTTPS
   ▼
Frontend Next.js ──/api/v1──▶ Backend Express ──▶ MongoDB Atlas
(Azure App Service)          (Azure App Service)
                                   │
                                   ├──▶ Midtrans (pembayaran, webhook)
                                   ├──▶ Google (login)
                                   ├──▶ Supabase Storage (poster)
                                   └──▶ SMTP (email)
```

Browser hanya berkomunikasi dengan frontend, lalu frontend meneruskan permintaan `/api/v1/*` ke backend. Dengan begitu cookie login (`SameSite=Strict`) tidak pernah dikirim lintas domain. Di backend, route memeriksa token dan peran, service memegang aturan bisnis dan transaksi, dan model Mongoose menyimpan data.

Alasan pemilihan setiap teknologi dan library (termasuk Zod, Mongoose, sharp, jsQR, dan lainnya) dijelaskan di [`docs/tech-stack.md`](docs/tech-stack.md). Cara backend dan browser menghubungi setiap layanan pihak ketiga (MongoDB Atlas, Midtrans, Google, Supabase, SMTP, Azure) dijelaskan langkah demi langkah di [`docs/integrations.md`](docs/integrations.md).

## Endpoint API

Base URL: **`https://passgo-api.azurewebsites.net/api/v1`** (lokal: `http://localhost:3000/api/v1`). Total **63 endpoint** (ditambah 2 endpoint internal untuk job).

**Konvensi:** respons sukses `{ "data": …, "meta": … }`; error memakai format RFC 9457 (`application/problem+json`) dengan `code` untuk logika dan `detail` berbahasa Indonesia. ID memakai UUID v7, uang dalam integer Rupiah, waktu dalam RFC 3339 UTC. Field yang tidak dikenal ditolak `422`.

**Legenda akses:**
🔓 publik (token opsional) · 🍪 cookie refresh + header CSRF (`Origin` terdaftar dan `X-Requested-With: fetch`) · 👤 login, peran apa pun · 🎟️ peserta · 🧑‍💼 penyelenggara **atau** panitia yang ditugaskan di acara itu · 👑 penyelenggara · ⭐ superadmin · 🔏 tanda tangan Midtrans · 🔁 wajib header `Idempotency-Key` · 🔒 wajib header `If-Match: "<version>"` (atau `X-If-Match`)

### Health
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | 🔓 | Server hidup (tanpa memeriksa basis data) |
| GET | `/health/ready` | 🔓 | Server siap dan terhubung ke basis data |

### Autentikasi (`/auth`)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Daftar akun peserta. Selalu `202` agar email terdaftar tidak bisa ditebak |
| POST | `/auth/login` | 🔓 | Masuk dengan email dan password, mengembalikan access token dan cookie refresh |
| POST | `/auth/google` | 🔓 | Masuk dengan akun Google (ID token Google Identity Services) |
| POST | `/auth/refresh` | 🍪 | Menukar refresh token (dirotasi setiap dipakai) dengan access token baru |
| POST | `/auth/logout` | 🍪 | Keluar dari perangkat ini |
| POST | `/auth/logout-all` | 👤 | Keluar dari semua perangkat |
| POST | `/auth/email-verification` | 👤 | Kirim ulang email verifikasi |
| POST | `/auth/email-verification/confirm` | 🔓 | Konfirmasi verifikasi email dengan token dari email |
| POST | `/auth/password-reset` | 🔓 | Minta tautan reset password. Selalu `202` |
| POST | `/auth/password-reset/confirm` | 🔓 | Simpan password baru dengan token reset, lalu semua sesi dicabut |

### Akun sendiri (`/me`)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/me` | 👤 | Data akun yang sedang masuk |
| PATCH | `/me` | 👤 🔒 | Ubah nama dan nomor HP |
| POST | `/me/password` | 👤 | Ganti password. Sesi lain dicabut, sesi ini tetap berjalan |
| POST | `/me/organizer-request` | 👤 | Peserta mengajukan diri menjadi penyelenggara (email harus terverifikasi, tidak punya pembelian aktif) |
| GET | `/me/assigned-events` | 👤 | Acara yang ditugaskan kepada panitia (`when=upcoming\|past\|all`) |

### Pengguna (`/users`)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/users` | 👑 | Daftar pengguna. Filter `role`, `isActive`, `q`; urut `name` atau `createdAt` |
| POST | `/users` | 👑 🔁 | Buat akun panitia atau penyelenggara |
| GET | `/users/:userId` | 👑 | Detail pengguna |
| PATCH | `/users/:userId` | 👑 🔒 | Ubah nama, HP, peran (`STAFF` ↔ `ORGANIZER`), atau status aktif |
| GET | `/users/organizer-requests` | ⭐ | Daftar pengajuan penyelenggara yang menunggu |
| POST | `/users/:userId/organizer-request/approve` | ⭐ | Setujui pengajuan, peran berubah menjadi penyelenggara |
| POST | `/users/:userId/organizer-request/reject` | ⭐ | Tolak pengajuan dengan catatan |

### Acara (`/events`)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/events` | 🔓 | Katalog. Selain penyelenggara hanya melihat acara terbit atau dibatalkan. Filter `q`, `when`, `from`, `to` |
| GET | `/events/by-slug/:slug` | 🔓 | Detail acara berdasarkan slug |
| GET | `/events/:eventId` | 🔓 | Detail acara berdasarkan ID |
| POST | `/events` | 👑 | Buat acara sebagai draf |
| PATCH | `/events/:eventId` | 👑 🔒 | Ubah data acara |
| DELETE | `/events/:eventId` | 👑 | Hapus acara (hanya draf) |
| POST | `/events/:eventId/publish` | 👑 | Terbitkan acara |
| POST | `/events/:eventId/cancel` | 👑 | Batalkan acara: tiket tidak berlaku, pesanan lunas ditandai perlu refund, pembeli diberi tahu lewat email |
| PUT | `/events/:eventId/poster` | 👑 | Unggah poster (multipart, maks 2 MB, JPEG/PNG/WebP, diubah ke WebP) |
| DELETE | `/events/:eventId/poster` | 👑 | Hapus poster |

### Tipe tiket
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/events/:eventId/ticket-types` | 🔓 | Daftar tipe tiket beserta sisa kuota |
| GET | `/events/:eventId/ticket-types/:ticketTypeId` | 🔓 | Detail tipe tiket |
| POST | `/events/:eventId/ticket-types` | 👑 | Buat tipe tiket (harga, kuota, masa jual, batas per pesanan) |
| PATCH | `/events/:eventId/ticket-types/:ticketTypeId` | 👑 🔒 | Ubah tipe tiket (kuota tidak boleh di bawah tiket yang sudah terjual) |
| DELETE | `/events/:eventId/ticket-types/:ticketTypeId` | 👑 | Hapus tipe tiket yang belum pernah dipesan |

### Panitia acara
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/events/:eventId/staff` | 👑 | Daftar panitia yang ditugaskan |
| PUT | `/events/:eventId/staff/:userId` | 👑 | Tugaskan panitia ke acara |
| DELETE | `/events/:eventId/staff/:userId` | 👑 | Cabut penugasan panitia |

### Pesanan (`/orders`)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/orders` | 👤 🔁 | Buat pesanan dan tahan kuota 30 menit. Acara gratis langsung lunas. Mengembalikan token Midtrans Snap |
| GET | `/orders` | 🎟️ 👑 | Pesanan milik sendiri (peserta) atau semua pesanan (penyelenggara) |
| GET | `/orders/:orderId` | 🎟️ 👑 | Detail pesanan dan status pembayaran |
| POST | `/orders/:orderId/cancel` | 🎟️ 👑 | Batalkan pesanan yang belum dibayar, kuota dilepas |
| POST | `/orders/:orderId/ticket-email` | 🎟️ 👑 | Kirim ulang e-tiket ke email (maks 3 kali per jam) |
| POST | `/orders/:orderId/payment/sync` | 🎟️ 👑 | Cek ulang status pembayaran ke Midtrans |
| POST | `/orders/:orderId/refund` | 👑 🔁 | Catat pengembalian dana, tiket menjadi tidak berlaku |

### Pembayaran
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/payments/midtrans/notifications` | 🔏 | Webhook Midtrans. Tanda tangan SHA-512 dan nominal diverifikasi sebelum pesanan ditandai lunas |

### Tiket (`/tickets`)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/tickets` | 🎟️ | Tiket milik sendiri |
| GET | `/tickets/:ticketId` | 🎟️ | Detail tiket beserta kode dan isi QR |
| PATCH | `/tickets/:ticketId` | 🎟️ 🔒 | Ubah nama pemegang tiket |
| POST | `/tickets/:ticketId/reissue` | 👑 🔒 | Terbitkan ulang kode tiket, kode lama tidak berlaku |

### Check-in, peserta, dan laporan
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/events/:eventId/check-ins` | 🧑‍💼 | Check-in dengan QR atau kode manual. Hasil: diterima, sudah dipakai, di luar jam check-in, tidak berlaku, acara lain, atau tidak dikenal |
| GET | `/events/:eventId/check-ins` | 🧑‍💼 | Riwayat pindaian (panitia hanya melihat pindaiannya sendiri) |
| GET | `/events/:eventId/check-ins/:checkInId` | 🧑‍💼 | Detail satu pindaian |
| POST | `/events/:eventId/check-ins/:checkInId/revert` | 👑 | Batalkan check-in yang keliru, dengan alasan |
| GET | `/events/:eventId/attendees` | 🧑‍💼 | Daftar peserta (data pembeli disamarkan untuk panitia) |
| GET | `/events/:eventId/attendees/export` | 👑 | Ekspor peserta, `format=csv` atau `format=xlsx` |
| GET | `/events/:eventId/reports/sales` | 👑 | Laporan penjualan |
| GET | `/events/:eventId/reports/attendance` | 🧑‍💼 | Laporan kehadiran |

### Log audit
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/audit-logs` | 👑 | Jejak aksi penting. Filter `action`, `entityType`, `entityId`, `actorId`, `eventId`, `from`, `to` |

### Internal
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET/POST | `/internal/jobs/send-emails` | `Authorization: Bearer $CRON_SECRET` | Kirim antrean email |
| GET/POST | `/internal/jobs/expire-pending-orders` | `Authorization: Bearer $CRON_SECRET` | Kedaluwarsakan pesanan yang lewat batas bayar |

Endpoint internal tidak termasuk 63 endpoint di atas dan hanya dipakai scheduler. Detail body, contoh respons, dan daftar kode error setiap endpoint ada di [`docs/api-contract.md`](docs/api-contract.md).

## Struktur Repositori

```
PassGo/
├── apps/
│   ├── backend/                # Express API
│   │   ├── src/
│   │   │   ├── app.ts          # aplikasi Express (dipakai juga oleh test)
│   │   │   ├── index.ts        # server jangka panjang + job berkala
│   │   │   ├── routes/         # router per resource, skema Zod, di-mount di /api/v1
│   │   │   ├── services/       # logika bisnis dan transaksi (pesanan, pembayaran, check-in, ...)
│   │   │   ├── models/         # skema Mongoose
│   │   │   ├── middlewares/    # autentikasi, otorisasi, rate limit, error handler
│   │   │   ├── lib/            # Midtrans, mailer, storage, token
│   │   │   ├── templates/      # template email
│   │   │   └── utils/          # AppError, If-Match, UUID
│   │   ├── scripts/            # seed penyelenggara, seed acara demo, set superadmin
│   │   └── tests/              # unit dan integrasi
│   └── frontend/               # Next.js
│       └── src/
│           ├── app/            # halaman (App Router), grup rute (site) dan layar pemindai
│           ├── components/     # komponen UI yang dipakai ulang
│           ├── lib/            # klien API, autentikasi, format
│           └── types/          # tipe data API
├── docs/                       # arsitektur, kontrak API, panduan deploy
├── postman/                    # koleksi pengujian API
├── video/                      # video presentasi (Remotion) dan naskah narasi
└── .github/workflows/          # deploy otomatis ke Azure
```

## Menjalankan Secara Lokal

Prasyarat: Node.js 22.18 atau lebih baru, MongoDB replica set (MongoDB Atlas gratis sudah replica set), dan akun sandbox Midtrans.

```bash
npm install                                         # dari root, menginstal semua workspace
cp apps/backend/.env.example apps/backend/.env      # isi MONGODB_URI, JWT_ACCESS_SECRET, MIDTRANS_*, SMTP_*
cp apps/frontend/.env.example apps/frontend/.env    # BACKEND_URL=http://localhost:3000
npm run db:seed                                     # akun penyelenggara pertama (SEED_ORGANIZER_* di .env)
npm run db:seed:demo                                # contoh acara untuk demo (opsional)
npm run dev:backend                                 # API di http://localhost:3000
npm run dev:frontend                                # web di http://localhost:3001
```

Buka **http://localhost:3001**. Di `.env` backend, isi `CSRF_ALLOWED_ORIGINS`, `CORS_ORIGIN`, dan `FRONTEND_URL` dengan `http://localhost:3001` agar login berfungsi dan tautan di email mengarah ke web.

Menandai penyelenggara sebagai superadmin (dijalankan dari `apps/backend`):

```bash
npx tsx --env-file=.env scripts/set-superadmin.ts email@contoh.com          # tambah --off untuk mencabut
```

Untuk menguji webhook Midtrans secara lokal, ekspos backend dengan tunnel (mis. `ngrok http 3000`) lalu daftarkan `https://<tunnel>/api/v1/payments/midtrans/notifications` sebagai Payment Notification URL di dashboard sandbox Midtrans.

## Pengujian

| Perintah | Fungsi |
|---|---|
| `npm test --workspace=apps/backend` | Unit test backend (node:test dan supertest) |
| `npm run typecheck --workspace=apps/backend` | Pemeriksaan tipe backend |
| `npm run lint --workspace=apps/frontend` | Lint frontend |
| `npm run test:api` | Pengujian API Postman/Newman ke backend lokal |

Test integrasi di `apps/backend/tests/integration` hanya berjalan bila `MONGODB_URI` diisi, dan akan memakai basis data tersebut.

## Deploy

Frontend dan backend dideploy ke **Azure App Service** lewat GitHub Actions setiap ada push ke `main`. Langkah lengkapnya ada di [`docs/deploy-azure.md`](docs/deploy-azure.md).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/PROJECT.md`](docs/PROJECT.md) | Dokumentasi lengkap dalam satu file: user story, fitur, model data, alur, keamanan, pengujian, ADR |
| [`docs/tech-stack.md`](docs/tech-stack.md) | Alasan pemilihan setiap teknologi dan library |
| [`docs/integrations.md`](docs/integrations.md) | Cara menghubungi setiap layanan pihak ketiga (Atlas, Midtrans, Google, Supabase, SMTP, Azure) |
| [`docs/architecture.md`](docs/architecture.md) | Latar belakang, matriks wewenang, model data, alur pemesanan, pembayaran, dan check-in, email outbox, keamanan, ADR |
| [`docs/api-contract.md`](docs/api-contract.md) | Kontrak REST API v1: konvensi, autentikasi, format error, idempotency, concurrency, semua endpoint |
| [`docs/deploy-azure.md`](docs/deploy-azure.md) | Deploy frontend dan backend ke Azure App Service |
| [`postman/README.md`](postman/README.md) | Menjalankan pengujian API dengan Postman atau Newman |
| [`video/NASKAH.md`](video/NASKAH.md) | Naskah narasi video presentasi |
