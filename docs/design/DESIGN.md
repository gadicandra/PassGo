# PassGo Design System

Satu-satunya sumber gaya PassGo. Token di sini sama persis dengan `apps/frontend/src/app/globals.css`.
Dipakai juga sebagai design system di Stitch, jadi layar baru otomatis seragam.

## Karakter

Marketplace tiket acara komunitas kreatif (workshop cetak, gig kecil, pasar zine) di Indonesia.
Hangat dan ramai seperti pasar seni akhir pekan, tapi rapi. Bukan dashboard SaaS, bukan aplikasi HP.
Website responsif: desain desktop dulu (1440px, kontainer 1200px, grid 12 kolom), lalu 390px.

## Warna

| Token | Hex | Pakai untuk |
|---|---|---|
| navy | #14213D | Satu-satunya warna gelap: header, footer, judul, teks utama |
| navy-soft | #1C2E54 | Hover di atas navy |
| brand | #F04E23 | Tombol utama (satu per halaman), harga, state aktif, logo |
| brand-dark | #D63C10 | Hover tombol utama |
| sun | #F5A623 | Band sorotan, label status menunggu |
| teal | #1B6B63 | Aksen ketiga, status sukses/lunas/gratis |
| cream | #FFF8F0 | Latar halaman; teks di atas warna gelap |
| white | #FFFFFF | Kartu dan kolom form |
| line | navy 15% | Garis pemisah 1px |
| muted | #6B6B66 | Teks sekunder |
| danger | #BA1A1A | Error, dibatalkan |

Pasangan warna yang boleh (teks di atas latar): cream di brand, sun di navy, navy di sun, cream di teal,
brand di cream, navy di cream. Tidak boleh: sun di brand, cream di sun, teal di navy.
Tidak ada gradient, glow, blur, glassmorphism, atau warna ungu.

## Tipografi

| Peran | Font | Aturan |
|---|---|---|
| Judul utama | Archivo 800 (bukan Archivo Narrow) | Hanya SATU per halaman, sentence case, tracking -3%, 44-56px desktop |
| UI & isi | Hanken Grotesk 400/600 | Judul section 20px/600, isi 15-16px, label 14px/600 |
| Deskripsi acara | Source Serif 4 400 | Hanya teks panjang deskripsi, 18px, line-height 1.65 |
| Kode | JetBrains Mono | Hanya kode tiket dan nomor pesanan |

Harga dan total memakai Hanken Grotesk 600 dengan tabular numerals.
Tidak ada teks kapital semua, kecuali di dalam artwork poster dan logo.
Tidak ada label kecil kapital berjarak lebar di atas judul.

## Bentuk & ruang

- Radius: kartu 12px, tombol & input 8px, field 6px.
- Bayangan kartu: 0 2px 8px rgba(20,33,61,.08); hover 0 6px 16px rgba(20,33,61,.14).
- Bayangan keras (poster di hero): 8px 8px 0 #14213D.
- Spasi hanya 4, 8, 12, 16, 24, 32, 48, 64px.
- Kelompokkan dengan jarak dan garis 1px, bukan kotak putih di tiap grup. Kolom tidak simetris (7+5, 8+4).

## Logo

Tulisan "PASSGO" Archivo 800 warna cream di dalam blok brand, radius kiri 6px, dengan takik setengah
lingkaran di sisi kanan (warna latar di belakangnya) seperti sobekan tiket.

## Komponen khas

- **Poster acara (4:5):** blok warna solid dari pasangan yang diizinkan, 2-3 kata kunci judul besar
  (Archivo 800, kapital, line-height .92), blok tanggal cream di kiri atas (angka hari + bulan),
  foto duotone (grayscale + multiply) di zona sendiri. Judul tidak pernah menimpa foto atau terpotong.
  Habis = pita navy diagonal "HABIS". Dibatalkan = latar cream, foto abu-abu, judul dicoret di bawah poster.
- **Kartu acara:** poster + 3 baris: judul 16px Archivo 800, "Tempat · 09.00 WIB" 13px muted,
  harga/status 14px 600 (brand = harga, teal = Gratis, muted = Segera dibuka/Selesai, danger = Dibatalkan).
  Seluruh kartu link; hover naik 4px dan miring -1 derajat.
- **Bentuk tiket:** takik setengah lingkaran atas-bawah + garis perforasi titik-titik navy 30%.
  Dipakai di hero katalog, header detail acara, tiket QR, ringkasan pesanan.
- **Kartu sobekan landscape:** thumbnail poster 130px | perforasi | isi; border 2px navy, latar putih.
- **Tombol:** primary brand (satu per halaman), dark navy, outline navy 30%, text link.
  Tinggi 44px (kecil 36px). Panah carousel: kotak navy 44px, hover brand.
- **Form:** label di atas, border navy 25%, radius 6px, error teks merah di bawah field.
  Lebar field sesuai isi (email 360px, HP 200px, harga 140px).
- **Status:** satu kata berwarna, bukan pill/badge.

## Larangan

Ikon di samping teks (kecuali search, panah, close, back, menu akun), emoji, ilustrasi, pill/badge,
subjudul di bawah judul section, section "cara kerja"/testimoni/statistik, rating, jumlah terjual publik,
avatar bertumpuk, promo/diskon, kategori acara, running text, phone frame, bottom tab bar, sidebar dashboard.

## Bahasa

Bahasa Indonesia, pendek, tanpa nada marketing. "Beli tiket", "Tiket saya", "Masuk".
Format: Rp75.000, Gratis, "Sab, 10 Okt 2026 · 09.00 WIB".
