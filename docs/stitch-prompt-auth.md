# Prompt Stitch — Halaman Auth, Profil & Organizer (bagian Adi)

Cara pakai: buka project Stitch PassGo yang sudah berisi desain final (katalog, detail acara, komponen), lalu
tempel **Prompt utama** sekali. Setelah itu kirim **Prompt per layar** satu per satu agar setiap layar konsisten
dan tidak terkompresi. Lampirkan 1–2 screenshot layar referensi yang sudah ada (header + katalog) sebagai gambar.

---

## Prompt utama (konteks, kirim sekali)

```
Continue the existing PassGo design system in this project. Do NOT invent a new style — reuse the exact
header, footer, colors, type, radius and shadows from the screens already generated here (catalog, event
detail, components sheet). Attached screenshots are the source of truth.

Product: PassGo, a ticketing site for a small creative community in Yogyakarta (workshops, gigs, zine fairs).
All UI copy is in Bahasa Indonesia. Tone: warm, direct, short sentences, no exclamation marks.

Design tokens (use exactly):
- Navy #14213D (primary text, header bg, dark buttons), Navy soft #1C2E54 (hover)
- Brand orange #F04E23 (ONE solid primary button per screen, links), hover #D63C10
- Sun #F5A623 (warnings/notices, accents), Teal #1B6B63 (success, "verified", "active")
- Cream #FFF8F0 (page background — never pure white pages), White #FFFFFF (cards/forms only)
- Muted #6B6B66 (secondary text), Danger #BA1A1A (errors, destructive), Line rgba(20,33,61,0.15)
- Type: Archivo ExtraBold 800 for ONE page title per screen (tight tracking −3%); Hanken Grotesk for
  all UI text (15px body, 14px labels semibold); JetBrains Mono only for codes/IDs/action names.
- Radius: cards 12px, inputs 6px, buttons 8px. Shadow card: 0 2px 8px rgba(20,33,61,.08).
- Inputs: 44px tall, 1px navy/25% border, white fill, label above (14px semibold navy), hint below in muted,
  error below in danger red with red border. Never placeholder-only labels.
- Header: sticky navy bar, "PASSGO" wordmark = cream text on orange block with a half-circle ticket notch
  on its right edge; search field centered; account area on the right.
- Motif: ticket stubs (perforation line + half-circle notches). Use it sparingly as an accent, not on forms.

Hard rules:
- Max content width 1200px; auth forms are a single centered white card, max 448px wide, on cream.
- Mobile first: every screen must also work at 390px wide, 16px side gutters, no horizontal scroll.
- One orange solid button per screen; other actions use navy solid, outline, or text buttons.
- No gradients, no glassmorphism, no stock 3D illustrations, no emoji icons, no purple.
- Accessible: 4.5:1 contrast, visible focus ring (2px orange outline, 2px offset), 44px tap targets.
- Show realistic Indonesian data (names like Rina Kusuma, Bima Prasetyo; emails @gmail.com; WIB times).

Acknowledge with a one-line summary of the tokens, then wait for screen requests.
```

---

## Prompt per layar

### 1. Masuk (`/login`)
```
Screen: "Masuk" (sign in). Desktop 1440 + mobile 390.
Header in guest state (outline-light "Masuk" + orange "Daftar" buttons on the right).
Centered white card on cream: title "Masuk" (Archivo), subtitle "Masuk untuk membeli tiket dan melihat
tiket Anda." Fields: Email, Password (with show/hide eye toggle). Right-aligned text link "Lupa password?"
under the password. Full-width orange button "Masuk". Below the card, centered muted text
"Belum punya akun? Daftar" (Daftar = orange link).
Also show a second variant of the card with an error box above the button: light red background
(danger 5%), red border 40%, text "Email atau password tidak valid."
And a third variant: rate-limited, error box text "Terlalu banyak percobaan. Coba lagi dalam 14 menit."
```

### 2. Daftar (`/register`) + cek email
```
Screen: "Daftar" (register attendee). Same centered card layout as Masuk.
Fields: Nama lengkap, Email, Nomor HP (opsional) with placeholder "08…", Password with hint "8–64 karakter.",
Ulangi password. Orange full-width "Daftar". Footer "Sudah punya akun? Masuk".
Show the inline field-error state on Nomor HP: "Nomor HP harus nomor Indonesia, mis. 0812xxxxxxxx."
Second frame — success state replacing the form: title "Cek email Anda", text
"Kami mengirim tautan verifikasi ke rina.kusuma@gmail.com. Tautan berlaku 24 jam." (email in bold navy),
a simple line illustration of an envelope with a ticket-stub notch (navy line art, orange accent, no 3D),
full-width orange button "Lanjut masuk".
```

### 3. Verifikasi email (`/verify-email`) — 3 state
```
Screen: email verification result, three small frames side by side (same centered card):
a) Loading: title "Memverifikasi email…" with a small navy spinner.
b) Success: teal check badge, title "Email terverifikasi", text "Akun Anda siap dipakai untuk membeli tiket.",
   orange button "Lihat acara".
c) Failed: danger icon, title "Verifikasi gagal", text "Tautan sudah tidak berlaku. Minta tautan baru dari
   halaman profil.", outline button "Ke profil".
```

### 4. Lupa & reset password (`/forgot-password`, `/reset-password`)
```
Two screens, same centered card:
a) "Lupa password": text "Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru."
   Field Email, orange button "Kirim tautan reset", footer link "Kembali ke halaman masuk".
   Sent state: same card, text "Bila rina.kusuma@gmail.com terdaftar, tautan reset sudah dikirim.
   Tautan berlaku 30 menit." and no form.
b) "Buat password baru": fields Password baru (hint "8–64 karakter."), Ulangi password baru,
   orange "Simpan password". Done state: title "Password diganti", text "Semua perangkat sudah dikeluarkan.
   Masuk dengan password baru.", orange "Masuk".
```

### 5. Profil (`/profile`)
```
Screen: "Profil" for a logged-in attendee. Header shows the account menu button (user name + chevron,
outline-light on navy) instead of Masuk/Daftar. Content column max 672px on cream, page title "Profil".
Three stacked white cards (12px radius, card shadow, 24px padding), each with a 20px semibold heading:
1) "Data akun": a definition list — Email (bold), Peran "Peserta", Status email "Belum diverifikasi" in danger.
   Under it a sun-colored notice strip (sun 10% bg, sun 60% border): "Verifikasi email dulu sebelum membeli
   tiket." with a small navy button "Kirim ulang tautan". Then fields Nama, Nomor HP (hint "Kosongkan untuk
   menghapus."), navy button "Simpan profil" (left aligned, not full width).
2) "Ganti password": Password saat ini, Password baru, Ulangi password baru, navy "Ganti password".
3) "Sesi": outline button "Keluar" and a danger-colored text button "Keluar dari semua perangkat".
Use NO orange solid button on this page — all actions are navy/outline (profile is not a conversion page). Also show a verified variant of card 1 (status "Terverifikasi" in teal, no notice strip).
```

### 6. Menu akun (dropdown header)
```
Component: account dropdown opened from the header, three variants by role. White panel 224px wide,
8px radius, hover shadow, 8px padding, items 15px navy with navy-5% hover background, last item "Keluar"
in danger red.
- Peserta: Tiket saya, Pesanan saya, Profil, Keluar
- Panitia: Acara saya, Profil, Keluar
- Penyelenggara: Pesanan, Pengguna, Log audit, Profil, Keluar
Show it anchored under the header button, on desktop and on mobile (full-width sheet from the top-right
is NOT wanted — keep the same small dropdown, right-aligned with 16px margin).
```

### 7. Organizer — Pengguna (`/organizer/users`)
```
Screen: "Pengguna" (user management) for organizers, desktop 1440 + mobile 390.
Title row: "Pengguna" (Archivo) left, orange button "Tambah akun" right.
Filter row: search field "Cari nama/email", select "Peran" (Semua/Penyelenggara/Panitia/Peserta),
select "Status" (Semua/Aktif/Nonaktif).
White table card with columns: Nama (name bold + email muted below), Peran, Status ("Aktif" teal /
"Nonaktif" danger), Dibuat (e.g. "Sab, 10 Okt 2026"), and a small outline "Ubah" button per row.
8 realistic rows mixing roles. Below: pagination "Halaman 1 dari 3 · 47 pengguna" with outline
"Sebelumnya" / "Berikutnya". Mobile: table becomes stacked rows (name, email, role · status, Ubah).
Also show: loading skeleton rows (navy 8% bars) and empty state "Tidak ada pengguna yang cocok."
```

### 8. Organizer — dialog Tambah & Ubah akun
```
Two modal dialogs over the Pengguna screen with a navy 50% backdrop. White, 448px, 12px radius, 24px padding.
a) "Tambah akun panitia/penyelenggara": Nama, Email, Nomor HP (opsional), select Peran (Panitia default),
   Password awal (hint "8–64 karakter."). Footer right: text button "Batal", navy "Buat akun".
   Error variant: field error on Email "Email sudah digunakan."
b) "Ubah Bima Prasetyo" with the email muted under the title: Nama, Nomor HP, select Peran with hint
   "Mengubah peran mengeluarkan akun dari semua perangkat.", select Status with hint "Akun nonaktif langsung
   dikeluarkan dan tidak bisa masuk." Footer "Batal" + navy "Simpan".
   Error variant: error box "Harus ada minimal satu penyelenggara aktif."
```

### 9. Organizer — Log audit (`/organizer/audit-logs`)
```
Screen: "Log audit", desktop 1440 + mobile 390.
Filter row (wraps on mobile): select Aksi (e.g. USER_ROLE_CHANGED), select Jenis data (User/Event/Order/
Ticket/CheckIn), field "ID data" (placeholder "Tempel UUID"), date "Dari tanggal", date "Sampai tanggal".
A white list card with dividers; each row: action name in JetBrains Mono semibold (e.g. EVENT_PUBLISHED),
then muted "oleh Rina Kusuma · Event", timestamp right "Sab, 10 Okt 2026 · 09.00 WIB".
One row expanded: two side-by-side panels "Sebelum" / "Sesudah" showing small JSON in mono on navy-5% bg,
then a line "ID entitas 0192a3b4-… · IP 103.47.x.x" with text buttons "Riwayat data ini" and
"Aksi lain oleh Rina Kusuma". At the bottom, centered outline button "Muat lebih banyak".
Show a filter chip state above the filters: "Hanya aksi oleh satu pengguna. Hapus filter pelaku".
```

---

## Setelah generate

- Cek tiap layar: hanya **satu** tombol oranye solid, latar halaman krem, judul Archivo cuma satu.
- Ekspor kode/screenshot lalu sesuaikan ke komponen yang sudah ada (`Button`, `Field`, `FormError`,
  `AuthCard`, `Skeleton`) — jangan menyalin CSS mentah dari Stitch.
- Bila Stitch menggeser warna, ulangi dengan: "Use the exact hex tokens from the first message; this screen
  drifted to <warna>."
