# PassGo 🛒 — Berkah POS

Web kasir dan manajemen stok untuk Toko Kelontong "Berkah". Aplikasi ini menggantikan catatan penjualan yang tersebar di buku dan HP dengan satu sistem yang menyatukan katalog produk dan stok, pencatatan transaksi, peringatan stok menipis, dan laporan penjualan harian.

## Group Members

- Group 10
- Members:
    - Marcelinus Dinoglide Yoga Prakoso
    - Garjita Adicandra
    - Rasyid Rayhan Novandy
    - Debert Jamie Chanderson

## Features

**Inti**
- Katalog produk: nama, kategori, harga jual (bisa berubah kapan saja, ada riwayat harga), stok
- Transaksi penjualan yang otomatis mengurangi stok secara atomik
- Peringatan saat stok turun di bawah ambang per produk
- Laporan omzet harian dan produk terlaris
- Dua peran: **Pemilik** (kelola produk, stok, laporan) dan **Kasir** (hanya transaksi)

**Nilai tambah**
- Pembayaran QRIS via Midtrans
- Lookup produk lewat pemindaian barcode
- Ekspor laporan ke CSV/XLSX

## Documentation

| Dokumen | Isi |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Latar belakang, lingkup, matriks wewenang, tech stack, model data, alur bisnis, keamanan, roadmap |
| [`docs/api-contract.md`](docs/api-contract.md) | Kontrak REST API v1: konvensi, auth, format error, idempotency, semua endpoint |

## Tech Stack

| Bagian | Teknologi |
|---|---|
| Backend | Node.js ≥ 22.18, Express 5 (ESM), Prisma 7 + `@prisma/adapter-pg`, Zod 4, JWT |
| Database | PostgreSQL 16+ |
| Payment | Midtrans Core API (QRIS) |
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
│   │   │   ├── middlewares/     # auth, authorize (RBAC), validate, idempotency, error handler
│   │   │   ├── services/        # logika bisnis & transaksi DB
│   │   │   ├── validators/      # skema Zod
│   │   │   ├── lib/             # prisma client, logger, midtrans, SSE hub
│   │   │   ├── utils/           # AppError, money, date, pagination
│   │   │   ├── jobs/            # background job (expire QRIS, dll.)
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
