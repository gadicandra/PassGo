# Postman — PassGo API v1

Tes kontrak untuk [`../docs/api-contract.md`](../docs/api-contract.md) (58 endpoint), disusun mengikuti [`../docs/postman-plan.md`](../docs/postman-plan.md).

```
postman/
├── PassGo.postman_collection.json          # 81 request, 17 folder, format v2.1
├── PassGo.local.postman_environment.json   # variabel lokal
└── fixtures/poster.jpg                     # ≥600×600, ≤2 MB — siapkan sendiri, tidak di-commit
```

## Menjalankan

```bash
# 1. MongoDB harus berjalan sebagai replica set (POST /orders memakai transaksi)
#    Atlas, atau lokal: mongod --replSet rs0 --dbpath ... lalu rs.initiate()

# 2. Siapkan env backend
cp apps/backend/.env.example apps/backend/.env
#    isi MONGODB_URI, JWT_ACCESS_SECRET, dan SEED_ORGANIZER_PASSWORD

# 3. Seed akun organizer + attendee terverifikasi
npm run db:seed

# 4. Jalankan API
npm run dev:backend

# 5. Jalankan collection
npm run test:api
```

Di aplikasi Postman: import kedua berkas JSON, pilih environment **PassGo Local**, isi
`organizerPassword` dan `attendeePassword` sesuai seed, lalu jalankan folder dari 00 ke bawah
dengan Collection Runner. Urutan folder = alur end-to-end, dan setiap folder mengisi variabel
(`eventId`, `ticketTypeId`, `orderId`, …) untuk folder berikutnya.

## Penanda pada nama request

| Penanda | Arti |
|---|---|
| *(tanpa penanda)* | Endpoint Milestone 1 yang sudah ada di kode — harus hijau |
| `(BLM)` | Endpoint Milestone 1 yang **belum diimplementasikan** — merah sampai dibuat |
| `(M2)` | Fitur Milestone 2 (Midtrans, email, ekspor, laporan, audit) |

Dari 81 request: **52 seharusnya hijau sekarang**, 18 `(BLM)`, 11 `(M2)`.

Collection sengaja disusun dari kontrak, bukan dari kode (keputusan di `postman-plan.md` §1),
sehingga berfungsi sekaligus sebagai daftar pekerjaan: setiap request merah adalah satu hal
yang belum selesai.

## Test yang sengaja dibiarkan merah

Ini bukan bug di collection, melainkan gap implementasi yang diberi nama `[kontrak]` / `[M2]`
supaya terlihat di laporan Newman. Hapus test-nya kalau fiturnya sudah dibuat.

| Test | Gap |
|---|---|
| `[kontrak] X-Request-Id ada di response` | Middleware requestId belum ada (kontrak §1.1). Berlaku di **semua** request |
| `[kontrak] Cache-Control public max-age=60` | Belum diset pada katalog publik |
| `[kontrak §2.2] header WWW-Authenticate ada` | Belum dikirim pada 401 |
| `[kontrak §5] 400 idempotency-key-required` | Middleware idempotency belum ada (model `IdempotencyKey` sudah ada) |
| `[kontrak §5] header Idempotent-Replayed: true` | idem |
| `[kontrak] tiket terbit untuk pesanan PAID` | `createOrder` belum pernah membuat dokumen `Ticket` |
| `[kontrak] code max-per-order-exceeded` | Sekarang jatuh ke `409 quota-exceeded` lewat filter reservasi |
| `[kontrak §1.4] 405 Method Not Allowed + header Allow` | Express menjawab `404 route-not-found` |

## Catatan

- **Cookie refresh.** `__Secure-refresh_token` hanya dikirim lewat HTTPS. Di `http://localhost`
  cookie jar Postman/Newman bisa tidak mengirimkannya, sehingga `POST /auth/refresh` dan
  `/auth/logout` wajar gagal 401. Lihat `postman-plan.md` §7.3 untuk dua opsi solusinya.
- **Verifikasi email.** Job `email-outbox` baru ada di Milestone 2, jadi token verifikasi tidak
  pernah sampai ke inbox mana pun. Karena itu seed membuat satu akun ATTENDEE yang langsung
  `emailVerified: true` — folder 07 memakai akun itu untuk login, sementara `POST /auth/register`
  tetap diuji sampai `202`.
- **Race condition** (50 order konkuren untuk kuota 10, dua check-in bersamaan untuk satu tiket)
  tidak diuji di sini karena Runner Postman berjalan sekuensial. Tempatnya di
  `apps/backend/tests/integration` — lihat `architecture.md` §12.
- **Rate limit** tidak diuji otomatis: butuh ratusan request dan mengganggu run lain.
