# PassGo 🎟️ — Tiket Acara Komunitas

Platform tiket untuk komunitas kreatif yang rutin mengadakan workshop dan pertunjukan. PassGo menggantikan alur lama (formulir online → transfer manual → konfirmasi lewat WhatsApp) yang membuat panitia kewalahan dan kuota sering terjual melebihi kapasitas. Kuota berkurang otomatis dan dijamin tidak terlampaui, setiap tiket punya QR code unik, dan panitia memvalidasinya di pintu masuk.

Referensi produk: Loket.com, GoTix, Tiket.com.

| | Link |
|---|---|
| 🌐 Website | **[https://passgo-web.azurewebsites.net](https://passgo-web.azurewebsites.net)** <!-- TODO: ganti dengan URL Azure final --> |
| 🎬 Video demo | **[Tonton di YouTube](https://youtu.be/TODO)** <!-- TODO: ganti dengan link video --> |
| 💻 Repository | [github.com/gadicandra/PassGo](https://github.com/gadicandra/PassGo) |

## Group Members

- Group 10
- Members:
    - Marcelinus Dinoglide Yoga Prakoso
    - Garjita Adicandra
    - Rasyid Rayhan Novandy
    - Debert Jamie Chanderson

## Features

**Inti**
- Kelola acara: judul, tanggal, lokasi, deskripsi, poster
- Beberapa tipe tiket per acara (Presale, Reguler, VIP, …) dengan harga, kuota, dan jendela penjualan masing-masing
- Kuota berkurang otomatis dan tidak pernah terlampaui, termasuk saat banyak pembeli memesan bersamaan (reservasi atomik + constraint DB)
- Tiket elektronik dengan kode/QR unik, divalidasi di pintu masuk (tahan pindai ganda)
- Tiga peran: **Penyelenggara** (kelola acara, tipe tiket, panitia, laporan), **Panitia** (pindai tiket di acara yang ditugaskan), **Peserta** (beli & lihat tiket)

**Nilai tambah**
- Pembayaran via Midtrans Snap (QRIS, e-wallet, VA, kartu)
- E-ticket dikirim ke email (dengan QR inline)
- Daftar peserta, laporan penjualan & kehadiran, ekspor CSV/XLSX

## Documentation

| Dokumen | Isi |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Latar belakang, lingkup, matriks wewenang, tech stack, model data, alur pemesanan/pembayaran/check-in, email outbox, keamanan, roadmap, ADR |
| [`docs/api-contract.md`](docs/api-contract.md) | Kontrak REST API v1: konvensi, auth, format error, idempotency, concurrency, semua endpoint |
| [`docs/deploy-azure.md`](docs/deploy-azure.md) | Deploy frontend & backend ke Azure App Service lewat GitHub Actions |
| [`postman/README.md`](postman/README.md) | Menjalankan pengujian API (Postman/Newman) |

## Tech Stack

| Bagian | Teknologi |
|---|---|
| Backend | Node.js ≥ 22.18, Express 5 (ESM), Mongoose, Zod 4, JWT |
| Database | MongoDB (replica set required for transactions) |
| Payment | Midtrans Snap |
| Email | Nodemailer (SMTP; Mailpit saat development) |
| Storage | Supabase Storage (poster acara, di-*re-encode* WebP dengan sharp) |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |

## Repository Structure

```
monorepo-passgo/
├── apps/
│   ├── backend/                 # Express API
│   │   ├── src/lib/database.ts  # Mongoose connection lifecycle
│   │   ├── src/
│   │   │   ├── config/          # env & konstanta
│   │   │   ├── controllers/     # request → service → response
│   │   │   ├── routes/          # router per resource, mount di /api/v1
│   │   │   ├── middlewares/     # auth, authorize, validate, idempotency, upload, error handler
│   │   │   ├── services/        # logika bisnis & transaksi DB (order, payment, check-in, …)
│   │   │   ├── validators/      # skema Zod
│   │   │   ├── lib/             # Mongoose, logger, midtrans, mailer, storage
│   │   │   ├── utils/           # AppError, kode tiket, date, pagination
│   │   │   ├── jobs/            # expire-pending-orders, email-outbox, cleanup
│   │   │   ├── templates/
│   │   │   │   └── emails/      # template email (e-ticket, verifikasi, dll.)
│   │   │   ├── models/         # Mongoose schemas and models
│   │   │   └── index.js
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── .env.example
│   │   └── package.json
│   └── frontend/                # Next.js App
│       ├── src/
│       │   └── app/
│       └── package.json
├── docs/                        # Arsitektur & API contract
├── packages/                    # Shared modules
├── .gitignore
└── package.json                 # Root workspace configuration
```

## Menjalankan secara lokal

Prasyarat: Node.js ≥ 22.18, MongoDB replica set (MongoDB Atlas gratis sudah replica set), akun sandbox Midtrans.

```bash
npm install                                         # dari root, menginstal semua workspace
cp apps/backend/.env.example apps/backend/.env      # isi MONGODB_URI, JWT_ACCESS_SECRET, MIDTRANS_*, SMTP_*
cp apps/frontend/.env.example apps/frontend/.env    # BACKEND_URL=http://localhost:3000
npm run db:seed                                     # akun penyelenggara pertama (SEED_ORGANIZER_* di .env)
npm run dev:backend                                 # API di http://localhost:3000
npm run dev:frontend                                # web di http://localhost:3001
```

Buka **http://localhost:3001**. Di `.env` backend, isi `CSRF_ALLOWED_ORIGINS`, `CORS_ORIGIN`, dan `FRONTEND_URL`
dengan `http://localhost:3001` agar login berfungsi dan tautan di email mengarah ke web.
Akun panitia dibuat oleh penyelenggara dari menu **Pengguna**; peserta mendaftar sendiri.

| Perintah | Fungsi |
|---|---|
| `npm test --workspace=apps/backend` | Unit test backend |
| `npm run lint --workspace=apps/frontend` | Lint frontend |
| `npm run test:api` | Pengujian API Postman/Newman ke backend lokal |
| `npm run db:seed:demo --workspace=apps/backend` | Isi contoh acara untuk demo |

Untuk menguji webhook Midtrans secara lokal, ekspos backend dengan tunnel (mis. `ngrok http 3000`) lalu daftarkan `https://<tunnel>/api/v1/payments/midtrans/notifications` sebagai Payment Notification URL di dashboard sandbox Midtrans. Email dev dapat dilihat di Mailpit (`http://localhost:8025`).

## Deploy

Frontend dan backend di-deploy ke **Azure App Service** lewat GitHub Actions setiap push ke `main`.
Langkah lengkap: [`docs/deploy-azure.md`](docs/deploy-azure.md).
