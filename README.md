# PassGo 🎟️ — Tiket Acara Komunitas

Platform tiket untuk komunitas kreatif yang rutin mengadakan workshop dan pertunjukan. PassGo menggantikan alur lama (formulir online → transfer manual → konfirmasi lewat WhatsApp) yang membuat panitia kewalahan dan kuota sering terjual melebihi kapasitas. Kuota berkurang otomatis dan dijamin tidak terlampaui, setiap tiket punya QR code unik, dan panitia memvalidasinya di pintu masuk.

Referensi produk: Loket.com, GoTix, Tiket.com.

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

## Tech Stack

| Bagian | Teknologi |
|---|---|
| Backend | Node.js ≥ 22.18, Express 5 (ESM), Prisma 7 + `@prisma/adapter-pg`, Zod 4, JWT |
| Database | PostgreSQL 16+ |
| Payment | Midtrans Snap |
| Email | Nodemailer (SMTP; Mailpit saat development) |
| Storage | Supabase Storage (poster acara, di-*re-encode* WebP dengan sharp) |
| Frontend | Next.js (App Router) |

## Repository Structure

```
monorepo-passgo/
├── apps/
│   ├── backend/                 # Express API
│   │   ├── prisma/              # schema.prisma, migrations, seed
│   │   ├── src/
│   │   │   ├── config/          # env & konstanta
│   │   │   ├── controllers/     # request → service → response
│   │   │   ├── routes/          # router per resource, mount di /api/v1
│   │   │   ├── middlewares/     # auth, authorize, validate, idempotency, upload, error handler
│   │   │   ├── services/        # logika bisnis & transaksi DB (order, payment, check-in, …)
│   │   │   ├── validators/      # skema Zod
│   │   │   ├── lib/             # prisma client, logger, midtrans, mailer, storage
│   │   │   ├── utils/           # AppError, kode tiket, date, pagination
│   │   │   ├── jobs/            # expire-pending-orders, email-outbox, cleanup
│   │   │   ├── templates/
│   │   │   │   └── emails/      # template email (e-ticket, verifikasi, dll.)
│   │   │   ├── generated/       # Prisma Client (hasil generate, tidak di-commit)
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

## Getting Started (Backend)

```bash
npm install                                   # dari root, menginstal semua workspace
cp apps/backend/.env.example apps/backend/.env
npm run prisma:generate --workspace=apps/backend
npm run db:migrate --workspace=apps/backend
npm run dev:backend
```

Untuk menguji webhook Midtrans secara lokal, ekspos server dengan tunnel (mis. `ngrok http 4000`) lalu daftarkan `https://<tunnel>/api/v1/payments/midtrans/notifications` sebagai Payment Notification URL di dashboard sandbox Midtrans. Email dev dapat dilihat di Mailpit (`http://localhost:8025`).
