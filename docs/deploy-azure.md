# Tutorial Deploy PassGo ke Azure App Service

Panduan lengkap dari nol sampai website jalan: frontend (Next.js) dan backend (Express) di dua Web App Linux,
deploy otomatis lewat GitHub Actions setiap push ke `main`.

```
Browser ──► https://<WEB>.azurewebsites.net  (Next.js standalone)
                │  rewrite /api/v1/* dan /uploads/*
                ▼
            https://<API>.azurewebsites.net  (Express)  ◄── webhook Midtrans
                │
                ▼
            MongoDB Atlas · Supabase Storage · SMTP · Midtrans sandbox
```

Browser hanya bicara ke frontend. Next.js meneruskan `/api/v1/*` ke backend, jadi cookie refresh
`SameSite=Strict` tetap satu origin (kontrak §1.2). Karena itu **semua alamat untuk browser memakai URL frontend**.

Waktu yang dibutuhkan: ±45 menit untuk pertama kali.

---

## Daftar isi

0. [Persiapan](#0-persiapan)
1. [Isi variabel shell & pilih region](#1-isi-variabel-shell)
2. [Buat resource Azure](#2-buat-resource-azure)
3. [Konfigurasi backend](#3-konfigurasi-backend)
4. [Konfigurasi frontend](#4-konfigurasi-frontend)
5. [Hubungkan GitHub Actions](#5-hubungkan-github-actions)
6. [Layanan luar: Atlas & Midtrans](#6-layanan-luar-mongodb-atlas--midtrans)
7. [Merge & deploy pertama](#7-merge--deploy-pertama)
8. [Verifikasi](#8-verifikasi)
9. [Update README](#9-update-readme)
10. [Troubleshooting](#10-troubleshooting)
11. [Biaya & membersihkan](#11-biaya--membersihkan)

---

## 0. Persiapan

### 0.1 Yang harus sudah ada

| Kebutuhan | Cek |
|---|---|
| Akun Azure (Azure for Students memberi kredit gratis) | https://portal.azure.com bisa dibuka |
| Akses admin ke repo `gadicandra/PassGo` | Bisa buka Settings → Secrets di GitHub |
| `apps/backend/.env` lokal yang sudah jalan | `npm run dev:backend` berhasil konek ke Atlas |
| Node.js ≥ 22.18 dan `gh` CLI sudah login | `node -v` · `gh auth status` |

### 0.2 Install & login Azure CLI

Ubuntu/Debian (installer resmi Microsoft):

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az version
```

Login. Browser akan terbuka; tanpa browser pakai `--use-device-code`:

```bash
az login
# atau: az login --use-device-code
```

Pastikan subscription yang aktif benar (mis. "Azure for Students"):

```bash
az account list -o table
az account set --subscription "<nama atau id subscription>"
az account show --query "{name:name, user:user.name}" -o table
```

Daftarkan provider Web (sekali per subscription, aman diulang):

```bash
az provider register --namespace Microsoft.Web --wait
```

### 0.3 Cek isi `.env.example` sebelum push

Commit `chore/azure-deploy` ikut membawa perubahan `apps/backend/.env.example`. File itu publik di GitHub,
jadi pastikan **tidak ada password, secret, atau URI asli** di dalamnya:

```bash
git show chore/azure-deploy:apps/backend/.env.example
```

Kalau ada nilai asli, kosongkan dulu, lalu:

```bash
git add apps/backend/.env.example
git commit --amend --no-edit
```

---

## 1. Isi variabel shell

Semua perintah di bawah memakai variabel ini. Jalankan sekali di terminal yang sama dari root repo.
Nama app harus **unik global** (jadi subdomain `*.azurewebsites.net`); tambah akhiran bila sudah dipakai.

```bash
cd /path/ke/PassGo

RG=passgo-rg                 # resource group
LOC=southeastasia            # GANTI dengan region yang diizinkan, lihat 1.1 di bawah
PLAN=passgo-plan             # satu plan dipakai bersama oleh dua app
API=passgo-api               # nama Web App backend  → https://passgo-api.azurewebsites.net
WEB=passgo-web               # nama Web App frontend → https://passgo-web.azurewebsites.net

API_URL=https://$API.azurewebsites.net
WEB_URL=https://$WEB.azurewebsites.net
echo "$API_URL  $WEB_URL"
```

### 1.1 Cari region yang diizinkan (wajib untuk Azure for Students)

Subscription **Azure for Students** dibatasi policy ke beberapa region saja (biasanya 3–5, berbeda per akun).
Region lain ditolak dengan `RequestDisallowedByAzure ... best available regions`. Lihat daftarnya:

```bash
az policy assignment list \
  --query "[?parameters.listOfAllowedLocations].{policy:displayName, regions:parameters.listOfAllowedLocations.value}" -o json
```

Pilih satu region dari daftar itu dan isi `LOC`. Urutan yang disarankan (paling dekat ke Indonesia dulu):
`southeastasia` → `eastasia` → `japaneast` → `koreacentral` → `centralindia` → `australiaeast` → apa saja
yang tersedia. Region di AS/Eropa tetap jalan normal, hanya ±150–250 ms lebih lambat dari Indonesia.

```bash
LOC=<region-dari-daftar>     # mis. LOC=eastasia
```

Bila perintah di atas kosong, buka Portal → **Policy** → **Assignments** →
*Allowed resource deployment regions* → tab **Parameters**.

Atlas sebaiknya di region yang berdekatan dengan `LOC`. Cluster Atlas yang sudah ada tidak perlu dipindah;
koneksi lintas region tetap jalan, hanya query sedikit lebih lambat.

### 1.2 Cek nama belum dipakai

Hasilnya harus `nameAvailable: true` untuk keduanya:

```bash
az rest --method post \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/providers/Microsoft.Web/checknameavailability?api-version=2022-03-01" \
  --body "{\"name\":\"$API\",\"type\":\"Microsoft.Web/sites\"}" --query nameAvailable
az rest --method post \
  --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/providers/Microsoft.Web/checknameavailability?api-version=2022-03-01" \
  --body "{\"name\":\"$WEB\",\"type\":\"Microsoft.Web/sites\"}" --query nameAvailable
```

---

## 2. Buat resource Azure

### 2.1 Resource group dan plan

Pakai **B1**: mendukung *Always On*, sehingga job berkala (expire pesanan, kirim email) tetap jalan walau sepi.
Dua app berbagi satu plan, jadi biaya hanya satu B1.

```bash
az group create -n $RG -l $LOC
az appservice plan create -g $RG -n $PLAN --is-linux --sku B1 -l $LOC
```

`-l $LOC` ditulis eksplisit di plan: tanpa itu plan ikut region resource group, yang mungkin dibuat di region
lain sebelumnya. Kedua Web App otomatis ikut region plan.

> **Kena `RequestDisallowedByAzure`?** Region `LOC` tidak ada di daftar 1.1. Resource group yang sudah
> terlanjur dibuat boleh tetap dipakai (policy memblokir plan, bukan resource group). Ganti `LOC` dengan region
> yang diizinkan, lalu jalankan ulang hanya perintah `az appservice plan create` di atas.

> **Mau gratis (F1)?** Ganti `--sku B1` dengan `--sku F1` dan lewati semua `--always-on true` di bawah
> (F1 tidak mendukungnya). App akan tidur setelah ±20 menit sepi; request pertama lambat dan email bisa
> tertunda sampai ada request berikutnya. Cukup untuk demo singkat.

### 2.2 Dua Web App Node 22

Cek nama runtime Node yang tersedia, lalu buat app:

```bash
az webapp list-runtimes --os linux | grep NODE     # pastikan ada NODE:22-lts

az webapp create -g $RG -p $PLAN -n $API --runtime "NODE:22-lts"
az webapp create -g $RG -p $PLAN -n $WEB --runtime "NODE:22-lts"
```

### 2.3 Pengaturan umum (keduanya)

HTTPS saja, TLS minimal 1.2, FTP mati, log container aktif, dan *basic auth* dinyalakan karena GitHub
Actions memakai **publish profile** (yang butuh basic auth):

```bash
for APP in $API $WEB; do
  az webapp update -g $RG -n $APP --https-only true --basic-auth Enabled
  az webapp config set -g $RG -n $APP --always-on true --min-tls-version 1.2 --ftps-state Disabled --http20-enabled true
  az webapp log config -g $RG -n $APP --docker-container-logging filesystem
done
```

---

## 3. Konfigurasi backend

### 3.1 Startup command dan health check

Paket backend dari CI berisi `dist/` + `node_modules` produksi, jadi cukup jalankan `node`:

```bash
az webapp config set -g $RG -n $API --startup-file "node dist/index.js"
az webapp config set -g $RG -n $API --generic-configurations healthCheckPath=/api/v1/health
```

### 3.2 App settings (environment variables)

Nilai diambil dari `apps/backend/.env` lokal Anda, lalu beberapa di-*override* untuk produksi. Skrip ini
menulis JSON ke folder sementara di luar repo, mengirimnya ke Azure, lalu menghapusnya, sehingga secret
tidak masuk riwayat shell maupun git.

```bash
TMP=$(mktemp -d)
(cd apps/backend && API_URL=$API_URL WEB_URL=$WEB_URL node -e '
  const fs = require("node:fs");
  const env = require("dotenv").parse(fs.readFileSync(".env"));
  // Tidak dipakai saat runtime produksi, atau diatur Azure sendiri.
  for (const k of ["PORT", "RATE_LIMIT_DISABLED", "SEED_ORGANIZER_EMAIL", "SEED_ORGANIZER_PASSWORD",
                   "SEED_ATTENDEE_EMAIL", "SEED_ATTENDEE_PASSWORD"]) delete env[k];
  Object.assign(env, {
    NODE_ENV: "production",
    SCM_DO_BUILD_DURING_DEPLOYMENT: "false",       // paket dari CI sudah lengkap
    FRONTEND_URL: process.env.WEB_URL,             // tautan di email
    CSRF_ALLOWED_ORIGINS: process.env.WEB_URL,     // refresh/logout hanya dari web
    CORS_ORIGIN: process.env.WEB_URL,
    PUBLIC_BASE_URL: process.env.API_URL,          // URL poster bila Supabase tidak dipakai
    MIDTRANS_NOTIFICATION_URL: process.env.API_URL + "/api/v1/payments/midtrans/notifications",
    TRUST_PROXY: "2",                              // front end Azure (web) → Next → front end Azure (api)
    JOB_INTERVAL_SECONDS: "60",
  });
  const rows = Object.entries(env).filter(([, v]) => v !== "").map(([name, value]) => ({ name, value, slotSetting: false }));
  fs.writeFileSync(process.argv[1], JSON.stringify(rows));
  console.log("Akan diset:", rows.map((r) => r.name).join(", "));
' "$TMP/api-settings.json")

# Kirim ke Azure, coba ulang bila koneksi putus. File baru dihapus setelah berhasil.
for i in 1 2 3; do
  az webapp config appsettings set -g $RG -n $API --settings @"$TMP/api-settings.json" -o none \
    && { echo "Berhasil"; rm -rf "$TMP"; break; } \
    || { echo "Gagal (percobaan $i), coba lagi 10 detik..."; sleep 10; }
done
```

> **Masih `Connection reset by peer` setelah 3 kali?** Jaringan Anda (Wi-Fi kampus, VPN, proxy) memutus
> koneksi ke Azure. Coba jaringan lain (hotspot HP), atau isi lewat Portal: file JSON masih ada di
> `echo $TMP/api-settings.json`. Buka Portal → app backend → **Settings → Environment variables** →
> **Advanced edit**, gabungkan isi file itu ke dalam array JSON yang tampil, **Apply**, lalu **Apply** lagi
> di halaman utama. Setelah selesai: `rm -rf "$TMP"`.

Periksa daftar key yang terkirim (nilainya disembunyikan Azure):

```bash
az webapp config appsettings list -g $RG -n $API --query "[].name" -o tsv | sort
```

Pastikan minimal ada: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
`MIDTRANS_IS_PRODUCTION` (`false` untuk sandbox), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`MAIL_FROM`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `FRONTEND_URL`,
`CSRF_ALLOWED_ORIGINS`, `CORS_ORIGIN`, `TRUST_PROXY`.

> **`SMTP_PASS`:** dulu `.env.example` salah ketik `SMPT_PASS`. Bila `.env` Anda masih memakai nama itu,
> ubah jadi `SMTP_PASS` lalu ulangi 3.2, kalau tidak email tidak bisa login ke SMTP.

Mengubah satu nilai nanti:

```bash
az webapp config appsettings set -g $RG -n $API --settings JOB_INTERVAL_SECONDS=120 -o none
```

---

## 4. Konfigurasi frontend

### 4.1 Startup command dan health check

Server standalone Next ada di `apps/frontend/server.js` di dalam paket. Azure mengisi `HOSTNAME` dengan
nama container, padahal server Next memakai variabel itu untuk alamat bind, jadi set ke `0.0.0.0`.
`PORT` diisi otomatis oleh Azure.

```bash
az webapp config set -g $RG -n $WEB --startup-file "HOSTNAME=0.0.0.0 node apps/frontend/server.js"
az webapp config set -g $RG -n $WEB --generic-configurations healthCheckPath=/login
az webapp config appsettings set -g $RG -n $WEB --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false NODE_ENV=production -o none
```

Frontend tidak butuh secret apa pun di Azure. `BACKEND_URL` dibaca **saat build** di GitHub Actions
(rewrite `/api/v1` dan CSP terkunci ke dalam hasil build), jadi diatur di langkah 5, bukan di sini.

---

## 5. Hubungkan GitHub Actions

Workflow sudah ada di repo: `.github/workflows/deploy-backend.yml` dan `deploy-frontend.yml`. Keduanya
membaca nama app dan alamat backend dari *repository variables*, dan kredensial dari *repository secrets*.

Jalankan dari root repo (perintah `gh` memakai repo di folder ini):

```bash
# Variables (tidak rahasia)
gh variable set AZURE_BACKEND_APP_NAME  -b "$API"
gh variable set AZURE_FRONTEND_APP_NAME -b "$WEB"
gh variable set BACKEND_URL             -b "$API_URL"

# Secrets: publish profile diambil langsung dari Azure dan di-pipe ke GitHub, tidak pernah ditulis ke disk
az webapp deployment list-publishing-profiles -g $RG -n $API --xml | gh secret set AZURE_BACKEND_PUBLISH_PROFILE
az webapp deployment list-publishing-profiles -g $RG -n $WEB --xml | gh secret set AZURE_FRONTEND_PUBLISH_PROFILE

gh variable list
gh secret list
```

> Publish profile berisi password deploy. Bila bocor, reset dari Portal (app → *Reset publish profile*),
> lalu jalankan ulang dua baris `gh secret set` di atas.

---

## 6. Layanan luar: MongoDB Atlas & Midtrans

### 6.1 MongoDB Atlas: izinkan IP backend

Ambil semua IP keluar yang mungkin dipakai backend:

```bash
az webapp show -g $RG -n $API --query possibleOutboundIpAddresses -o tsv | tr ',' '\n'
```

Atlas → **Network Access** → *Add IP Address* → masukkan tiap IP di atas.
Untuk demo cepat boleh `0.0.0.0/0` (akses dari mana saja; keamanan tetap dari username/password DB).

Bila database produksi masih kosong (bukan DB yang sama dengan deploy sebelumnya), buat akun penyelenggara
pertama dari laptop dengan URI produksi:

```bash
npm run db:seed                                   # memakai MONGODB_URI & SEED_ORGANIZER_* dari apps/backend/.env
npm run db:seed:demo --workspace=apps/backend     # opsional: contoh acara untuk demo
```

### 6.2 Midtrans sandbox: notification URL

Dashboard sandbox Midtrans (https://dashboard.sandbox.midtrans.com) → **Settings → Configuration**:

| Field | Isi |
|---|---|
| Payment Notification URL | `https://<API>.azurewebsites.net/api/v1/payments/midtrans/notifications` |
| Finish / Unfinish / Error Redirect URL | `https://<WEB>.azurewebsites.net/orders` |

```bash
echo "$API_URL/api/v1/payments/midtrans/notifications"
echo "$WEB_URL/orders"
```

### 6.3 Supabase

Tidak ada perubahan. CSP frontend sudah mengizinkan `*.supabase.co` untuk poster.

---

## 7. Merge & deploy pertama

Urutan penting: **secrets dan variables (langkah 5) harus sudah ada sebelum workflow jalan**.

### 7.1 Push branch dan buat PR

```bash
git push -u origin chore/azure-deploy
gh pr create --base main --head chore/azure-deploy \
  --title "chore(deploy): Azure App Service untuk frontend dan backend" \
  --body "Workflow GitHub Actions, Next standalone, TRUST_PROXY + strip port XFF Azure, job berkala in-process, docs/deploy-azure.md."
```

Minta review tim, lalu merge (dari GitHub atau `gh pr merge --merge`). Merge ke `main` memicu kedua workflow.

### 7.2 Pantau workflow

```bash
gh run list --limit 5
gh run watch                     # pilih run yang sedang berjalan
```

Bila workflow sempat jalan sebelum secrets diisi dan gagal, jalankan ulang manual:

```bash
gh workflow run deploy-backend.yml  --ref main
gh workflow run deploy-frontend.yml --ref main
```

Deploy backend dulu dan pastikan sehat (langkah 8.1) sebelum mengandalkan frontend.

### 7.3 Lihat log aplikasi

```bash
az webapp log tail -g $RG -n $API      # harus muncul: Backend server running on port ...
az webapp log tail -g $RG -n $WEB      # harus muncul: Ready in ...
```

---

## 8. Verifikasi

### 8.1 Dari terminal

```bash
# Backend hidup dan terhubung ke database
curl -s $API_URL/api/v1/health/ready
# → {"data":{"status":"ready","checks":{"database":"ok"}}}

# Frontend meneruskan API ke backend (rewrite)
curl -s $WEB_URL/api/v1/health
# → {"data":{"status":"ok"}}

# CSRF origin cocok: 401 = lolos CSRF (belum ada cookie), 403 = CSRF_ALLOWED_ORIGINS salah
curl -s -X POST -H "Origin: $WEB_URL" -H "X-Requested-With: fetch" $WEB_URL/api/v1/auth/refresh
# → {"...","code":"refresh-token-invalid"}

# Header keamanan frontend
curl -sI $WEB_URL/login | grep -iE "content-security-policy|x-frame-options"
```

### 8.2 Di browser (buka `$WEB_URL`)

- [ ] Katalog acara tampil, poster termuat
- [ ] **Daftar** akun baru → email verifikasi masuk → klik tautan → "Email terverifikasi"
- [ ] **Masuk** → reload halaman → tetap login (refresh cookie bekerja)
- [ ] **Profil**: ubah nama, ganti password, "Keluar dari semua perangkat"
- [ ] Masuk sebagai penyelenggara → **Pengguna**: tambah akun panitia → **Log audit** menampilkan `USER_CREATED`
- [ ] Beli tiket berbayar → Snap Midtrans muncul → bayar dengan simulator sandbox → status pesanan jadi Lunas
- [ ] Tiket QR muncul di **Tiket saya** dan e-tiket masuk email
- [ ] Panitia memindai QR → diterima; pindai kedua kali → "sudah masuk"

### 8.3 Pengujian API (opsional)

Menulis data sungguhan ke database produksi:

```bash
API_BASE_URL=$WEB_URL/api/v1 API_ORIGIN=$WEB_URL npm run test:api:prod
```

Bila sebagian request mendapat `429`, itu rate limit login/daftar; tunggu 15 menit lalu ulangi.

---

## 9. Update README

Ganti dua `TODO` di bagian atas `README.md` dengan URL website final dan link video:

```bash
sed -i "s#https://passgo-web.azurewebsites.net#$WEB_URL#g" README.md
sed -i "s#https://youtu.be/TODO#https://youtu.be/<ID-VIDEO-ANDA>#" README.md
sed -i "s# <!-- TODO: ganti dengan URL Azure final -->##; s# <!-- TODO: ganti dengan link video -->##" README.md
grep -n "Website\|Video" README.md
```

Pastikan kedua link bisa diklik di GitHub (buka halaman repo, klik keduanya), lalu commit:

```bash
git checkout main && git pull
git add README.md && git commit -m "docs: link website dan video demo"
git push
```

---

## 10. Troubleshooting

Pertama selalu lihat log: `az webapp log tail -g $RG -n <app>`.

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| `RequestDisallowedByAzure ... best available regions` saat membuat plan | Region tidak diizinkan untuk Azure for Students | Langkah 1.1, ganti `LOC`, ulangi `az appservice plan create ... -l $LOC` |
| `ConnectionResetError(104, 'Connection reset by peer')` dari perintah `az` | Koneksi jaringan ke Azure terputus (bukan error konfigurasi) | Jalankan ulang perintahnya; bila terus, ganti jaringan (hotspot) atau lewat Portal |
| Workflow gagal di langkah deploy, `401 Unauthorized` | Basic auth mati atau publish profile kedaluwarsa | Ulangi 2.3 (`--basic-auth Enabled`) lalu 5 (`gh secret set`) |
| Halaman "Application Error" / container restart terus | Startup command salah | Cek 3.1 / 4.1: `az webapp config show -g $RG -n <app> --query appCommandLine` |
| Frontend tidak menjawab, log: `Listening on <nama-container>` | `HOSTNAME` tidak di-override | Startup frontend harus diawali `HOSTNAME=0.0.0.0` |
| `/api/v1/health/ready` → 503 | Backend tidak bisa ke Atlas | Tambah IP dari 6.1 di Atlas Network Access |
| Request API dari web → 500 "Internal Server Error" polos | `BACKEND_URL` kosong saat build, rewrite ke localhost | Cek `gh variable list`, lalu `gh workflow run deploy-frontend.yml --ref main` |
| Login gagal `403 csrf-check-failed` | `CSRF_ALLOWED_ORIGINS` tidak sama persis dengan URL web | Harus `https://<WEB>.azurewebsites.net` tanpa `/` di akhir; ulangi 3.2 |
| Login berhasil tapi reload langsung keluar | Membuka backend langsung, bukan web | Selalu pakai `$WEB_URL`; cookie hanya berlaku lewat proxy |
| Email tidak terkirim | SMTP salah (`SMTP_PASS`) atau provider memblokir | Cek log "Gagal mengirim outbox email"; perbaiki `SMTP_*`, ulangi 3.2 |
| Tautan di email menuju localhost | `FRONTEND_URL` belum di-override | Ulangi 3.2 |
| Pembayaran Midtrans tidak mengubah status pesanan | Notification URL belum diisi / salah | Ulangi 6.2; atau tombol "Cek status pembayaran" di halaman pesanan |
| Poster tidak tampil | Supabase key salah, atau URL poster ditolak CSP | Cek Console browser; cek `SUPABASE_*` |
| Banyak `429 rate-limited` dari pengguna berbeda | `TRUST_PROXY` salah, semua terlihat satu IP | Harus `2`; `az webapp config appsettings list -g $RG -n $API --query "[?name=='TRUST_PROXY']"` |

Restart app setelah mengubah sesuatu yang tidak memicu restart otomatis:

```bash
az webapp restart -g $RG -n $API
az webapp restart -g $RG -n $WEB
```

---

## 11. Biaya & membersihkan

- Satu plan B1 menampung kedua app. Cek kredit tersisa di Portal → *Cost Management*.
- Bila project lama masih ter-deploy di Vercel dan terhubung ke `main`, putuskan salah satu sebagai produksi
  supaya tidak ada dua website aktif dengan database yang sama.

Setelah penilaian selesai, hapus semua resource sekaligus (tidak bisa dibatalkan):

```bash
az group delete -n $RG --yes --no-wait
```

---

## Catatan teknis

- **Rate limit per instance.** Hitungan disimpan di memori proses. Satu instance B1 = tepat. Bila di-*scale out*,
  limit efektif dikali jumlah instance (`apps/backend/src/middlewares/rate-limit.ts`).
- **Backend bisa diakses langsung.** Dengan `TRUST_PROXY=2`, pemanggil yang menembak backend langsung bisa
  memalsukan IP di `X-Forwarded-For` untuk lolos rate limit per IP. Untuk menutupnya, batasi akses backend
  hanya dari IP frontend dan Midtrans:

  ```bash
  # IP keluar frontend
  az webapp show -g $RG -n $WEB --query possibleOutboundIpAddresses -o tsv
  # Tambahkan satu per IP (prioritas angka kecil = dicek duluan); IP Midtrans lihat docs Midtrans
  az webapp config access-restriction add -g $RG -n $API --rule-name web --action Allow --ip-address <IP>/32 --priority 100
  ```

- **Job berkala.** Server backend menjalankan expire pesanan dan pengiriman outbox email tiap
  `JOB_INTERVAL_SECONDS`. Aman berjalan di beberapa instance (outbox di-*claim* atomik, expiry kondisional).
- **Ganti alamat backend** = build ulang frontend, karena `BACKEND_URL` terkunci di build:
  `gh variable set BACKEND_URL -b <url-baru> && gh workflow run deploy-frontend.yml --ref main`.
