# Postman — PassGo API v1

81 request, 17 folder, format v2.1. Disusun dari [`../docs/api-contract.md`](../docs/api-contract.md).

```
postman/
├── PassGo.postman_collection.json
├── PassGo.local.postman_environment.json
└── fixtures/poster.jpg            # siapkan sendiri, tidak di-commit
```

## Menjalankan

```bash
cp apps/backend/.env.example apps/backend/.env   # isi MONGODB_URI, JWT_ACCESS_SECRET, SEED_ORGANIZER_PASSWORD
npm run db:seed
npm run dev:backend
npm run test:api
```

MongoDB harus replica set (`POST /orders` memakai transaksi).

Di aplikasi Postman: import kedua JSON, pilih environment **PassGo Local**, isi
`organizerPassword` dan `attendeePassword`, jalankan dengan Collection Runner dari folder 00.
Tiap folder mengisi variabel (`eventId`, `ticketTypeId`, `orderId`, …) untuk folder berikutnya.

## Penanda

| Penanda | Arti | Jumlah |
|---|---|---|
| — | Endpoint M1 yang sudah ada, harus hijau | 52 |
| `(BLM)` | Endpoint M1 belum diimplementasikan | 18 |
| `(M2)` | Fitur Milestone 2 | 11 |

## Test yang sengaja merah

Gap implementasi, diberi awalan `[kontrak]` / `[M2]`. Hapus test-nya kalau fiturnya sudah jadi.

| Test | Gap |
|---|---|
| `X-Request-Id ada di response` | Middleware requestId belum ada (§1.1). Berlaku di semua request |
| `Cache-Control public max-age=60` | Belum diset di katalog publik |
| `header WWW-Authenticate ada` | Belum dikirim pada 401 |
| `400 idempotency-key-required` | Middleware idempotency belum ada |
| `header Idempotent-Replayed: true` | idem |
| `tiket terbit untuk pesanan PAID` | `createOrder` belum membuat dokumen `Ticket` |
| `code max-per-order-exceeded` | Sekarang jatuh ke `409 quota-exceeded` |
| `405 Method Not Allowed + header Allow` | Express menjawab `404 route-not-found` |

## Catatan

- `__Secure-refresh_token` hanya terkirim lewat HTTPS, jadi `/auth/refresh` dan `/auth/logout`
  wajar gagal 401 di `http://localhost`. Solusi: `postman-plan.md` §7.3.
- Job `email-outbox` baru ada di M2, jadi token verifikasi tidak sampai ke inbox. Seed membuat
  akun ATTENDEE yang langsung terverifikasi; folder 07 login dengan akun itu.
- Race condition (50 order konkuren, check-in ganda) tidak diuji di sini — Runner berjalan
  sekuensial. Tempatnya `apps/backend/tests/integration`, lihat `architecture.md` §12.
