# Brief untuk Claude di Stitch — layar Auth, Profil & Organizer (bagian Adi)

Cara pakai: buka project Stitch PassGo, lalu tempel seluruh blok di bawah ke Claude extension. Claude akan
mengecek isi project dulu, melapor, baru menulis prompt per layar. Jawab pertanyaannya bila ada konflik.

````
Kamu membantu mendesain layar baru untuk PassGo di project Stitch ini. Kerjakan dalam tiga tahap dan
BERHENTI di akhir tahap 1 untuk menunggu konfirmasi saya.

## Tahap 1 — Audit project Stitch (jangan generate apa pun dulu)

Periksa semua yang sudah ada di project ini: design guideline / design system, dan setiap layar referensi
yang sudah di-generate. Laporkan secara ringkas:

1. Token yang benar-benar dipakai: warna (hex + perannya), font + bobot + ukuran per peran (judul, UI,
   kode/ID), radius, shadow, spacing, lebar konten maksimum.
2. Komponen yang sudah ada dan bentuknya: header (state tamu & login), footer, tombol (varian & kapan
   dipakai), input/label/hint/error, kartu, dialog, tabel/list, skeleton, toast, motif tiket (perforasi,
   takik setengah lingkaran), logo/wordmark.
3. Aturan tersirat yang konsisten di semua layar (mis. hanya satu tombol oranye per layar, latar halaman
   krem, satu judul display per layar) dan larangan (gradient, warna tertentu, gaya ilustrasi).
4. Daftar layar yang sudah ada, supaya layar baru tidak menduplikasi.
5. Perbedaan dengan yang sudah diimplementasikan di kode (daftar di bawah). Untuk tiap perbedaan, sebutkan
   mana yang menurutmu benar. Jangan putuskan sendiri; saya yang memilih.

Yang sudah ada di kode frontend (diambil dari desain Stitch ini, mungkin sudah bergeser):
- Warna: navy #14213D, navy-soft #1C2E54, brand #F04E23 (hover #D63C10), sun #F5A623, teal #1B6B63,
  cream #FFF8F0 (latar halaman), muted #6B6B66, danger #BA1A1A, line rgba(20,33,61,.15).
- Font: Archivo 800 untuk satu judul utama per halaman; Hanken Grotesk untuk semua UI (body 15px);
  Source Serif 4 hanya deskripsi acara; JetBrains Mono hanya kode tiket, nomor pesanan, ID.
- Radius kartu 12px, shadow kartu 0 2px 8px rgba(20,33,61,.08); input tinggi 44px, label di atas,
  hint/error di bawah; tombol varian primary (oranye), dark (navy), outline, outline-light, text.
- Header navy sticky; wordmark "PASSGO" krem di blok oranye dengan takik setengah lingkaran di kanan.
- Konten maks 1200px; harus berfungsi di lebar 390px tanpa scroll horizontal.

## Tahap 2 — Tulis prompt per layar (setelah saya konfirmasi hasil audit)

Untuk setiap layar di daftar bawah, tulis satu prompt Stitch terpisah dalam bahasa Inggris yang:
- Merujuk ke layar/komponen yang SUDAH ADA di project ini dengan namanya (bukan menjelaskan ulang gaya
  dari nol), dan menyebut token persis hasil audit.
- Meminta desktop 1440 dan mobile 390.
- Memuat semua state yang saya minta (error, kosong, loading, sukses) sebagai frame terpisah.
- Memakai copy Bahasa Indonesia persis seperti di bawah (jangan diterjemahkan ke Inggris).
- Memakai data contoh realistis Indonesia (Rina Kusuma, Bima Prasetyo, @gmail.com, waktu WIB).
Satu layar per prompt. Jangan menggabungkan beberapa layar dalam satu generate.

## Tahap 3 — Generate & cek

Generate satu per satu sesuai urutan. Setelah tiap layar, cek terhadap hasil audit: token tidak bergeser,
aturan tersirat dipatuhi, komponen dipakai ulang (bukan versi baru yang mirip). Bila melenceng, perbaiki
dengan prompt koreksi singkat sebelum lanjut ke layar berikutnya.

---

## Layar yang dibutuhkan

Aturan fungsional ini sudah diimplementasikan di kode. Desain harus memuatnya; gaya mengikuti Stitch.

### 1. Masuk — /login
- Kartu tengah: judul "Masuk", subjudul "Masuk untuk membeli tiket dan melihat tiket Anda."
- Field: Email, Password (dengan tombol tampil/sembunyi). Link "Lupa password?" rata kanan di bawah password.
- Tombol "Masuk". Di bawah kartu: "Belum punya akun? Daftar".
- State: kotak error umum "Email atau password tidak valid."; rate limit
  "Terlalu banyak percobaan. Coba lagi nanti."
- Header dalam state tamu (tombol Masuk + Daftar).

### 2. Daftar — /register
- Judul "Daftar", subjudul "Buat akun peserta untuk membeli tiket."
- Field: Nama lengkap, Email, Nomor HP (opsional, placeholder "08…"), Password (hint "8–64 karakter."),
  Ulangi password. Tombol "Daftar". Footer "Sudah punya akun? Masuk".
- State error per field di Nomor HP: "Nomor HP harus nomor Indonesia, mis. 0812xxxxxxxx."
- State sukses menggantikan form: "Cek email Anda" — "Kami mengirim tautan verifikasi ke
  <email tebal>. Tautan berlaku 24 jam." + tombol "Lanjut masuk". Pesan ini sama untuk email baru maupun
  terdaftar (jangan desain varian "email sudah terdaftar").

### 3. Verifikasi email — /verify-email
- Tiga state di kartu yang sama: memuat ("Memverifikasi email…" + spinner); berhasil
  ("Email terverifikasi", "Akun Anda siap dipakai untuk membeli tiket.", tombol "Lihat acara");
  gagal ("Verifikasi gagal", "<alasan> Minta tautan baru dari halaman profil.", tombol "Ke profil").

### 4. Lupa password & reset — /forgot-password, /reset-password
- Lupa: "Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru." Field Email,
  tombol "Kirim tautan reset", link "Kembali ke halaman masuk". State terkirim tanpa form:
  "Bila <email> terdaftar, tautan reset sudah dikirim. Tautan berlaku 30 menit."
- Reset: "Buat password baru" — Password baru (hint "8–64 karakter."), Ulangi password baru,
  tombol "Simpan password". Error: "Tautan reset tidak berlaku atau sudah dipakai. Minta tautan baru."
  Selesai: "Password diganti" — "Semua perangkat sudah dikeluarkan. Masuk dengan password baru." + "Masuk".
- Tautan tidak lengkap: "Tautan tidak lengkap" + tombol "Minta tautan baru".

### 5. Profil — /profile
- Header dalam state login (tombol menu akun berisi nama user). Kolom konten sempit, judul "Profil".
- Tiga kartu bertumpuk:
  1. "Data akun": Email, Peran (Peserta/Panitia/Penyelenggara), Status email
     (Terverifikasi / Belum diverifikasi). Bila belum: strip peringatan
     "Verifikasi email dulu sebelum membeli tiket." + tombol kecil "Kirim ulang tautan".
     Field Nama, Nomor HP (hint "Kosongkan untuk menghapus."), tombol "Simpan profil".
     Error konflik: "Profil diubah dari perangkat lain. Data terbaru sudah dimuat, coba simpan lagi."
  2. "Ganti password": Password saat ini, Password baru, Ulangi password baru, tombol "Ganti password".
     Error: "Password saat ini salah."
  3. "Sesi": tombol "Keluar" dan aksi destruktif "Keluar dari semua perangkat".
- Halaman ini bukan halaman konversi: pertimbangkan tanpa tombol oranye; laporkan pilihanmu.

### 6. Menu akun (dropdown di header)
- Dibuka dari tombol nama user; item per peran, "Keluar" terakhir dengan warna destruktif:
  - Peserta: Tiket saya, Pesanan saya, Profil, Keluar
  - Panitia: Acara saya, Profil, Keluar
  - Penyelenggara: Pesanan, Pengguna, Log audit, Profil, Keluar
- Tetap dropdown kecil rata kanan di mobile (bukan sheet layar penuh).

### 7. Organizer — Pengguna — /organizer/users
- Judul "Pengguna" + tombol "Tambah akun".
- Filter: cari "Cari nama/email", select Peran (Semua/Penyelenggara/Panitia/Peserta),
  select Status (Semua/Aktif/Nonaktif).
- Tabel: Nama (nama tebal + email di bawah), Peran, Status (Aktif/Nonaktif), Dibuat
  ("Sab, 10 Okt 2026"), tombol "Ubah" per baris. Di mobile jadi baris bertumpuk.
- Pagination: "Halaman 1 dari 3 · 47 pengguna", "Sebelumnya" / "Berikutnya".
- State: skeleton saat memuat; kosong "Tidak ada pengguna yang cocok."

### 8. Organizer — dialog Tambah & Ubah akun
- "Tambah akun panitia/penyelenggara": Nama, Email, Nomor HP (opsional), Peran (Panitia/Penyelenggara,
  default Panitia), Password awal (hint "8–64 karakter."). Tombol "Batal" + "Buat akun".
  Error field Email: "Email sudah digunakan."
- "Ubah <nama>" dengan email di bawah judul: Nama, Nomor HP, Peran (hint "Mengubah peran mengeluarkan akun
  dari semua perangkat."), Status (hint "Akun nonaktif langsung dikeluarkan dan tidak bisa masuk.").
  Tombol "Batal" + "Simpan".
- Aturan yang memengaruhi tampilan: akun Peserta tidak punya field Peran; saat mengubah akun sendiri,
  field Peran dan Status disembunyikan.
- Error: "Harus ada minimal satu penyelenggara aktif." dan
  "Anda tidak bisa mengubah peran atau status akun sendiri. Minta penyelenggara lain."

### 9. Organizer — Log audit — /organizer/audit-logs
- Judul "Log audit". Filter: Aksi (mis. USER_ROLE_CHANGED), Jenis data (User/Event/Order/Ticket/CheckIn),
  ID data (placeholder "Tempel UUID"), Dari tanggal, Sampai tanggal.
- List: nama aksi dalam font mono (EVENT_PUBLISHED), "oleh Rina Kusuma · Event", waktu di kanan
  "Sab, 10 Okt 2026 · 09.00 WIB". Baris bisa dibuka: panel "Sebelum" / "Sesudah" berisi JSON kecil,
  baris "ID entitas … · IP …", aksi teks "Riwayat data ini" dan "Aksi lain oleh <nama>".
- Chip filter aktif: "Hanya aksi oleh satu pengguna." + "Hapus filter pelaku".
- Tombol "Muat lebih banyak" di bawah. State: skeleton; kosong "Belum ada catatan."
````

## Setelah desain jadi

- Kirim hasil audit tahap 1 ke Claude Code. Kalau token di Stitch beda dari kode, `globals.css` dan
  komponen bersama perlu disesuaikan (koordinasi dengan Marcel, pemilik scaffold).
- Implementasi tetap memakai komponen yang ada (`Button`, `Field`, `FormError`, `AuthCard`, `Skeleton`),
  bukan menyalin CSS mentah dari Stitch.
