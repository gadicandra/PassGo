# Postman — PassGo API v1

84 request, 17 folder, format v2.1. Disusun dari [`../docs/api-contract.md`](../docs/api-contract.md).

```
postman/
├── PassGo.postman_collection.json
├── PassGo.local.postman_environment.json   # template, tanpa kredensial
├── run.mjs                                 # menyuntik kredensial dari apps/backend/.env
└── fixtures/poster.jpg                     # siapkan sendiri, tidak di-commit
```

## Menjalankan

```bash
cp apps/backend/.env.example apps/backend/.env   # isi MONGODB_URI, JWT_ACCESS_SECRET,
                                                 # SEED_ORGANIZER_PASSWORD, MIDTRANS_*
npm run db:seed
npm run dev:backend
npm run test:api
```

`npm run test:api` membaca `apps/backend/.env` dan menyuntikkan `organizerEmail`,
`organizerPassword`, `attendeeEmail`, `attendeePassword`, `midtransServerKey`, `origin`, dan
`baseUrl` lewat `--env-var`. Berkas environment yang di-commit sengaja dibiarkan kosong supaya
kredensial tidak masuk git.

Lewat aplikasi Postman, nilai itu harus diisi manual: import kedua JSON, pilih environment
**PassGo Local**, klik 👁 → **Edit**, isi `organizerEmail`/`organizerPassword` dan
`attendeeEmail`/`attendeePassword` sesuai seed. Yang Anda isi di aplikasi tidak memengaruhi
`npm run test:api`, dan sebaliknya — keduanya terpisah.

Jalankan dari folder 00 ke bawah. Tiap folder mengisi variabel (`eventId`, `ticketTypeId`,
`ticketCode`, `orderId`, …) untuk folder berikutnya, jadi urutannya tidak boleh diloncati.

## Penanda

| Penanda | Arti | Jumlah |
|---|---|---|
| — | Sudah ada, harus hijau | 75 |
| `(BLM)` | Endpoint M1 belum dibangun | 2 |
| `(M2)` | Fitur Milestone 2 | 7 |

## Status terakhir

301 dari 312 assertion lulus. Folder yang hijau penuh: 00 Health, 01 Auth Organizer, 02 Users,
04 Ticket Types, 05 Publish & Staff, 06 Katalog Publik, 08 Orders Gratis, 10 Webhook Midtrans,
11 Tickets, 12 Check-ins.

Yang masih merah, semuanya karena fiturnya belum dibangun:

| Request | Hasil |
|---|---|
| `PUT`/`DELETE /events/:eventId/poster` | `404 route-not-found` |
| `POST /orders/:orderId/payment/sync` | `404 route-not-found` |
| `POST /orders/:orderId/refund` | `404 route-not-found` |
| `GET /events/:eventId/reports/sales` | `404 route-not-found` |
| `GET /events/:eventId/reports/attendance` | `404 route-not-found` |
| `GET /audit-logs` | `404 route-not-found` |
| Mailpit + `email-verification/confirm` | Mailpit tidak berjalan di `127.0.0.1:8025` |

## Catatan

- **Mailpit.** Job `email-outbox` baru ada di M2, dan Mailpit harus dijalankan terpisah
  (`docker run -p 8025:8025 -p 1025:1025 axllent/mailpit`). Tanpa itu token verifikasi tidak
  bisa diambil. Seed membuat akun ATTENDEE yang langsung terverifikasi, jadi folder 08 dan
  seterusnya tetap jalan.
- **Urutan folder 11 dan 12.** `holderName` hanya bisa diubah selama jendela check-in belum
  dibuka, sedangkan check-in butuh jendela itu sudah dibuka. Karena itu acara dibuat dengan
  `checkInOpensAt: null` (default `startAt − 2 jam`), lalu request pertama di folder 12
  memajukannya lewat `PATCH /events/:eventId`.
- **Kode tiket setelah reissue.** Response reissue adalah proyeksi organizer — hanya
  `codeMasked`, tanpa `code` (kontrak §10). Kode penuh diambil ulang lewat
  `GET /tickets/:ticketId` sebagai pemilik.
- **Race condition** (50 order konkuren, check-in ganda) tidak diuji di sini karena Runner
  berjalan sekuensial. Tempatnya `apps/backend/tests/integration`, lihat `architecture.md` §12.
