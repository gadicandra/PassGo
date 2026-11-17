# Deploy ke Azure App Service

Dua Web App Linux (Node 22 LTS): satu backend, satu frontend. Browser hanya bicara ke frontend; Next.js
mem-*proxy* `/api/v1/*` ke backend, jadi cookie refresh `SameSite=Strict` tetap same-origin (kontrak §1.2).

```
Browser ──► passgo-web.azurewebsites.net (Next standalone) ──rewrite /api/v1──► passgo-api.azurewebsites.net (Express)
                                                                                 ▲
                                                           Midtrans webhook ─────┘ (langsung ke backend)
```

Nama app di bawah contoh; ganti dengan nama yang Anda pilih (harus unik global).

## 1. Buat resource (Portal atau CLI)

Plan **B1** atau lebih: perlu *Always On* agar job berkala (expire pesanan, kirim email) tetap jalan.
Di F1 (gratis) app tidur setelah ±20 menit idle; job tetap jalan saat ada request, jadi masih bisa dipakai
untuk demo, hanya email bisa tertunda.

```bash
az group create -n passgo-rg -l southeastasia
az appservice plan create -g passgo-rg -n passgo-plan --is-linux --sku B1
az webapp create -g passgo-rg -p passgo-plan -n passgo-api --runtime "NODE:22-lts"
az webapp create -g passgo-rg -p passgo-plan -n passgo-web --runtime "NODE:22-lts"
```

## 2. Konfigurasi backend (`passgo-api`)

**Startup command** (Configuration → General settings): `node dist/index.js`
**Health check path**: `/api/v1/health`  ·  **Always On**: On

**App settings** (Configuration → Environment variables). Salin dari `apps/backend/.env`, lalu ubah:

| Key | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (paket dari CI sudah berisi `node_modules`) |
| `FRONTEND_URL` | `https://passgo-web.azurewebsites.net` |
| `CSRF_ALLOWED_ORIGINS` | `https://passgo-web.azurewebsites.net` |
| `CORS_ORIGIN` | `https://passgo-web.azurewebsites.net` |
| `TRUST_PROXY` | `2` (front end Azure frontend → Next → front end Azure backend) |
| `JOB_INTERVAL_SECONDS` | `60` |
| `MIDTRANS_NOTIFICATION_URL` | `https://passgo-api.azurewebsites.net/api/v1/payments/midtrans/notifications` |
| `MONGODB_URI`, `JWT_ACCESS_SECRET`, `MIDTRANS_*`, `SMTP_*`, `SUPABASE_*`, `MAIL_FROM` | sama seperti `.env` |

Jangan set `PORT` (Azure mengisinya) dan jangan set `RATE_LIMIT_DISABLED`.

**MongoDB Atlas** → Network Access: izinkan *Outbound IP addresses* backend (Properties di Portal), atau
`0.0.0.0/0` untuk demo.

**Midtrans sandbox** → Settings → Payment Notification URL: isi dengan `MIDTRANS_NOTIFICATION_URL` di atas.

## 3. Konfigurasi frontend (`passgo-web`)

**Startup command**: `HOSTNAME=0.0.0.0 node apps/frontend/server.js`
(Azure mengisi `HOSTNAME` dengan nama container; server standalone Next membaca variabel itu untuk bind.)
**Health check path**: `/login`  ·  **Always On**: On

**App settings**: `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false`. Tidak ada yang lain: `BACKEND_URL` dibaca saat
**build** di GitHub Actions (rewrite dan CSP terkunci di build), bukan saat runtime.

## 4. GitHub Actions

Workflow: `.github/workflows/deploy-backend.yml` dan `deploy-frontend.yml`. Jalan otomatis saat push ke
`main` yang mengubah app terkait, atau manual dari tab Actions (*Run workflow*).

Repo → Settings → Secrets and variables → Actions:

| Jenis | Nama | Nilai |
|---|---|---|
| Secret | `AZURE_BACKEND_PUBLISH_PROFILE` | Portal `passgo-api` → *Download publish profile*, tempel isi XML |
| Secret | `AZURE_FRONTEND_PUBLISH_PROFILE` | Sama, dari `passgo-web` |
| Variable | `AZURE_BACKEND_APP_NAME` | `passgo-api` |
| Variable | `AZURE_FRONTEND_APP_NAME` | `passgo-web` |
| Variable | `BACKEND_URL` | `https://passgo-api.azurewebsites.net` |

Download publish profile butuh *SCM Basic Auth Publishing Credentials* = On
(Configuration → General settings).

Urutan pertama kali: deploy backend → cek `/api/v1/health` → `npm run db:seed` dari laptop dengan
`MONGODB_URI` produksi (bila database baru) → deploy frontend.

## 5. Cek setelah deploy

```bash
curl -s https://passgo-api.azurewebsites.net/api/v1/health/ready      # {"data":{"status":"ready",...}}
curl -s https://passgo-web.azurewebsites.net/api/v1/health             # lewat proxy Next: {"data":{"status":"ok"}}
curl -s -X POST -H "Origin: https://passgo-web.azurewebsites.net" -H "X-Requested-With: fetch" \
  https://passgo-web.azurewebsites.net/api/v1/auth/refresh             # 401 refresh-token-invalid = CSRF lolos
```

Lalu di browser: daftar → email verifikasi masuk → masuk → reload halaman tetap login (refresh cookie).

## Catatan

- **Rate limit per instance.** Hitungan disimpan di memori proses. Satu instance B1 = tepat; bila di-scale out,
  limit efektif dikali jumlah instance (`middlewares/rate-limit.ts`).
- **Backend bisa diakses langsung.** Dengan `TRUST_PROXY=2`, pemanggil yang menembak backend langsung bisa
  memalsukan IP di `X-Forwarded-For` untuk melewati rate limit per IP. Untuk menutupnya: Networking → Access
  restriction backend, izinkan hanya *Outbound IP addresses* frontend + IP Midtrans.
- **Email lambat?** Cek Log stream backend; outbox dikirim setelah request terkait dan tiap
  `JOB_INTERVAL_SECONDS`.
- Postman ke produksi: `API_BASE_URL=https://passgo-web.azurewebsites.net/api/v1 API_ORIGIN=https://passgo-web.azurewebsites.net npm run test:api:prod`
  (menulis data sungguhan, lihat `postman/README.md`).
