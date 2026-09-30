# Postman — PassGo API v1

84 request, 17 folder, format v2.1. Disusun dari [`../docs/api-contract.md`](../docs/api-contract.md).

```
postman/
├── PassGo.postman_collection.json
├── PassGo.local.postman_environment.json   # template lokal, tanpa kredensial
├── PassGo.production.postman_environment.json  # https://pass-go-lime.vercel.app, tanpa kredensial
├── run.mjs                                 # menyuntik kredensial dari apps/backend/.env
└── fixtures/poster.jpg                     # 900x1125, dipakai PUT poster
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

### Production (Vercel)

```bash
npm run test:api:prod
```

Memakai environment **PassGo Production** (`baseUrl` `https://pass-go-lime.vercel.app/api/v1`,
`origin` `http://localhost:3000`, yang harus ada di `CSRF_ALLOWED_ORIGINS` Vercel). Kredensial
tetap dari `apps/backend/.env`, jadi password seed di sana harus sama dengan yang ada di database
Atlas. `API_BASE_URL`/`API_ORIGIN` menimpa nilai berkas bila perlu (mis. preview deployment).

Test ini menulis data sungguhan ke database production (event, pesanan, tiket, audit log).

Edge Vercel membalas sendiri setiap request ber-`If-Match` dengan `412 PRECONDITION_FAILED`,
jadi pre-request collection otomatis mengganti `If-Match` menjadi `X-If-Match` bila `baseUrl`
bukan localhost (kontrak §6). Lewat aplikasi Postman, pilih environment **PassGo Production**
dan isi kredensial seperti di atas; penggantian header berlaku juga di sana.

Jalankan dari folder 00 ke bawah. Tiap folder mengisi variabel (`eventId`, `ticketTypeId`,
`ticketCode`, `orderId`, …) untuk folder berikutnya, jadi urutannya tidak boleh diloncati.

## Penanda

| Penanda | Arti | Jumlah |
|---|---|---|
| — | Sudah ada, harus hijau | 77 |
| `(BLM)` | Endpoint M1 belum dibangun | 0 |
| `(M2)` | Fitur Milestone 2 | 7 |

## Status terakhir

**293 assertion, 0 gagal.** Seluruh folder hijau.

Tujuh request bertanda `(M2)` dilewati lewat `pm.execution.skipRequest()` di pre-request
script masing-masing, karena endpoint-nya belum dibangun:

| Request | Yang belum ada |
|---|---|
| `GET Mailpit` + `email-verification/confirm` | Job `email-outbox`. Tidak ada nodemailer di `src/`, email hanya menumpuk di koleksi `emailOutbox` |
| `POST /orders/:orderId/payment/sync` | Route belum ada |
| `POST /orders/:orderId/refund` | Route belum ada |
| `GET /events/:eventId/reports/sales` | Route belum ada |
| `GET /events/:eventId/reports/attendance` | Route belum ada |
| `GET /audit-logs` | Route belum ada |

Begitu endpoint-nya dibuat, hapus baris `pm.execution.skipRequest();` di pre-request script
request tersebut dan hapus awalan `(M2)` pada namanya.

## Catatan

- **Poster.** Bila `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` kosong, poster ditulis ke
  `apps/backend/uploads/` dan dilayani di `/uploads`. Cukup untuk development, tetapi host
  ephemeral (Vercel/Railway) menghapusnya tiap deploy, jadi produksi wajib mengisi `SUPABASE_*`.

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
