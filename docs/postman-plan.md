# Plan Postman — PassGo API v1

> Acuan: [`api-contract.md`](./api-contract.md) (58 endpoint) dan [`architecture.md`](./architecture.md).
> Collection disusun **dari kontrak**, bukan dari kode. Saat ini backend baru punya `GET /api/health`, jadi collection ini sekaligus menjadi tes kontrak yang akan hijau satu per satu seiring implementasi.

## 1. File

```
postman/
  PassGo.postman_collection.json          # format v2.1, bisa di-import & dijalankan dengan Newman
  PassGo.local.postman_environment.json
  fixtures/poster.jpg                     # ≥ 600×600, ≤ 2 MB, untuk PUT /events/:eventId/poster
```

Script di root `package.json`:

```json
"test:api": "npx newman run postman/PassGo.postman_collection.json -e postman/PassGo.local.postman_environment.json"
```

## 2. Environment Variables

| Var | Isi |
|---|---|
| `baseUrl` | `http://localhost:3000/api/v1` |
| `origin` | `http://localhost:3001` (wajib untuk CSRF di refresh/logout, §2.4) |
| `mailpitUrl` | `http://localhost:8025` |
| `midtransServerKey` | Server key sandbox, untuk menghitung signature webhook |
| `organizerEmail`, `organizerPassword` | Akun organizer dari seed |
| `organizerToken`, `staffToken`, `attendeeToken` | Diisi otomatis saat login |
| `eventId`, `eventSlug`, `ticketTypeId`, `ticketTypeFreeId`, `staffUserId`, `orderId`, `orderNumber`, `ticketId`, `ticketCode`, `checkInId` | Diisi otomatis dari response |
| `etag_me`, `etag_user`, `etag_event`, `etag_ticketType`, `etag_ticket`, `etag_attendee` | Versi terakhir per resource untuk `If-Match` |

## 3. Script Level Collection

Ditulis sekali di level collection lalu dipakai semua request.

**Pre-request**
- Mengisi `X-Request-Id` dan `Idempotency-Key` dengan `{{$guid}}`.
- Request 🔒 mengambil `If-Match` dari variabel `etag_*` yang sesuai.

**Test**
- `2xx`: body berbentuk `{ data, meta? }`.
- `4xx`/`5xx`: `Content-Type: application/problem+json`, dengan `code`, `requestId`, dan `instance`.
- `X-Request-Id` selalu ada di response.
- `ETag` disimpan otomatis bila ada.

**Auth**
- Bearer `{{accessToken}}` di level collection.
- Folder per peran meng-override token ke `organizerToken` / `staffToken` / `attendeeToken`.

## 4. Struktur Folder

Urutan folder = alur end-to-end, sehingga collection bisa dijalankan dengan Runner/Newman dari atas ke bawah.

| # | Folder | Isi utama |
|---|---|---|
| 00 | Health | `GET /health`, `GET /health/ready` |
| 01 | Auth: Organizer | Login dari seed → `organizerToken`; `GET /me`; `PATCH /me` dengan `If-Match` |
| 02 | Users | `POST /users` STAFF (🔁) → `staffUserId`; list, get, patch; login staff → `staffToken` |
| 03 | Events | Buat event DRAFT → patch → poster `PUT`/`DELETE` (multipart) |
| 04 | Ticket Types | Tipe berbayar + gratis; list, get, patch |
| 05 | Publish & Staff | Publish → `PUT /staff/:userId` (`201`, lalu `200` saat diulang) → list staff |
| 06 | Katalog Publik | `GET /events` tanpa token (cek `Cache-Control: public, max-age=60`), by-slug, ticket-types |
| 07 | Auth: Attendee | Register (`202`) → ambil token verifikasi dari **API Mailpit** → confirm (`204`) → login → `attendeeToken`; refresh & logout dengan header `Origin` + `X-Requested-With: fetch` |
| 08 | Orders: Gratis | `POST /orders` tiket gratis → langsung `PAID` → simpan `ticketId`, `ticketCode` |
| 09 | Orders: Berbayar | `POST /orders` → `PENDING_PAYMENT` + `snapToken`; replay dengan key sama (`Idempotent-Replayed: true`); `payment/sync`; cancel |
| 10 | Webhook Midtrans | Notifikasi `settlement` dengan `signature_key` = `SHA512(order_id + status_code + gross_amount + serverKey)` dihitung di pre-request (CryptoJS); signature salah → `403` |
| 11 | Tickets | List, get (`qrPayload`), `PATCH holderName`, reissue (organizer) |
| 12 | Check-ins | Staff scan `PASSGO1:<code>` → `201`; scan ulang → `409 ticket-already-checked-in`; kode acak → `404`; list, get; revert (organizer) |
| 13 | Attendees & Reports | Attendees (organizer vs staff, cek masking field), export CSV/XLSX, laporan sales & attendance |
| 14 | Audit Logs | Filter `eventId` |
| 15 | Cancel & Cleanup | Refund order; cancel event (🔁); hapus event DRAFT kedua; `logout-all` |
| 99 | Negative / RBAC | Lihat §5 |

## 5. Folder Negatif (99)

| Kategori | Kasus → Ekspektasi |
|---|---|
| RBAC | Tamu → `401` pada endpoint 👑 · Attendee/Staff → `403 forbidden` pada endpoint 👑 · Staff yang tidak ditugaskan → `404 event-not-found` · Attendee membuka order milik orang lain → `404 order-not-found` · Staff memanggil `/orders` → `403` |
| Concurrency | PATCH tanpa `If-Match` → `428` · `If-Match` basi → `412` + `current` · `If-Match: *` → `428` · `W/"1"` → `412` |
| Idempotency | Tanpa key → `400 idempotency-key-required` · Key sama, body beda → `422 idempotency-key-reused` |
| Validasi | Field tak dikenal (mis. `price` di order) → `422` · Query param berulang → `422` · `expectedUnitPrice` salah → `409 price-changed` · `quantity > maxPerOrder` → `422 max-per-order-exceeded` · `PATCH` body `{}` → `422` |
| Routing | Route tidak ada → `404 route-not-found` · Method salah → `405` + header `Allow` · ID bukan UUID → `404` |
| CSRF | Refresh tanpa `Origin` / `X-Requested-With` → `403 csrf-check-failed` |
| Auth | Token rusak di endpoint 🔓 → `401` (bukan diperlakukan sebagai tamu) · `WWW-Authenticate` ada di setiap `401` |
| Rate limit | Satu request manual untuk `429` + `Retry-After`. **Dinonaktifkan secara default.** |

## 6. Di Luar Postman

| Hal | Alasan | Diuji di mana |
|---|---|---|
| Race condition (50 order konkuren untuk kuota 10, check-in ganda) | Runner Postman berjalan sekuensial | `apps/backend/tests/integration` (supertest), architecture §12 |
| Rate limit penuh | Butuh ratusan request dan mengganggu run lain | Manual (folder 99, dinonaktifkan) |
| Pembayaran Snap sungguhan | Butuh UI Snap | Disimulasikan lewat webhook (folder 10). Webhook melakukan konfirmasi ulang ke Midtrans sandbox, jadi `midtransServerKey` harus key sandbox yang asli |

## 7. Temuan yang Perlu Dibereskan Dulu

1. `apps/backend/src/index.js` memakai `/api/health`, sedangkan kontrak memakai `/api/v1/health`.
2. `.env.example` masih berisi sisa proyek lama:
   - DB `berkah_pos`, `JWT_ISSUER=berkah-pos-api`, `JWT_AUDIENCE=berkah-pos`, `STORE_TIMEZONE`.
   - Kontrak memakai `passgo-api` / `passgo` / `APP_TIMEZONE`.
   - Variabel yang belum ada: `ORDER_HOLD_MINUTES`, `FRONTEND_URL`, SMTP/Mailpit, dan Supabase.
3. **Cookie `__Secure-refresh_token` lewat `http://localhost`:**
   - Browser menerimanya, tetapi cookie jar Postman/Newman bisa tidak mengirim cookie `Secure` lewat HTTP.
   - Solusi A: folder refresh/logout menyalin cookie ke header `Cookie` lewat script.
   - Solusi B: nama cookie tanpa prefix `__Secure-` saat `NODE_ENV=development`.

## 8. Tahapan Pengerjaan

| Fase | Folder |
|---|---|
| Milestone 1 | 00–08, 11, 12, 13 (attendees), 99 |
| Milestone 2 | 09, 10, 13 (export & reports), 14, 15 |
