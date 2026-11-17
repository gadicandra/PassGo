// Semua teks video di satu tempat: ubah di sini tanpa menyentuh komponen adegan.

export const links = {
  repo: "github.com/gadicandra/PassGo",
  web: "[tautan web PassGo]",
};

export const intro = {
  subtitle: "Aplikasi Penjualan Tiket Acara Komunitas",
  meta: "Kelompok 10 · Pemrograman Aplikasi Web 2026 · Universitas Gadjah Mada",
};

export const about = {
  title: "Pengenalan Aplikasi",
  lead: "PassGo adalah aplikasi web untuk menjual tiket acara komunitas, seperti lokakarya, pertunjukan musik, pameran, dan diskusi.",
  points: [
    { title: "Pembelian Tiket", body: "Peserta memilih acara dan tipe tiket, lalu membayar melalui QRIS, dompet digital, atau transfer bank." },
    { title: "E-Tiket", body: "Tiket yang sudah dibayar tersimpan di akun peserta dan dilengkapi kode QR." },
    { title: "Pengelolaan Acara", body: "Panitia memindai tiket di lokasi, sedangkan penyelenggara memantau penjualan dan kehadiran." },
  ],
};

export const background = {
  title: "Latar Belakang",
  lead: "Banyak acara komunitas masih menjual tiket secara manual. Cara ini menimbulkan beberapa masalah.",
  points: [
    { title: "Pembayaran manual", body: "Panitia memeriksa bukti transfer satu per satu melalui pesan singkat." },
    { title: "Kuota sulit dijaga", body: "Rekap di spreadsheet membuat tiket bisa terjual melebihi kapasitas." },
    { title: "Tiket mudah dipalsukan", body: "Tiket berupa gambar atau nama di daftar sulit diperiksa di pintu masuk." },
  ],
};

export const architecture = {
  title: "Arsitektur Sistem",
  lead: "Frontend dan backend dipisah. Browser hanya berkomunikasi dengan satu alamat, lalu frontend meneruskan permintaan API ke backend.",
  nodes: {
    client: { title: "Browser", body: "Peserta, panitia, penyelenggara" },
    frontend: { title: "Frontend", body: "Next.js · Vercel / Azure" },
    backend: { title: "REST API", body: "Express 5 · Node.js" },
    database: { title: "Basis Data", body: "MongoDB Atlas" },
  },
  services: ["Midtrans: pembayaran dan notifikasi", "Google: login dengan akun Google", "Supabase: penyimpanan poster", "SMTP: email tiket dan verifikasi"],
};

export const security = {
  title: "Keamanan dan Keandalan",
  lead: "Beberapa mekanisme diterapkan supaya data dan transaksi tetap aman.",
  points: [
    { title: "Autentikasi berlapis", body: "Token akses berumur pendek disimpan di memori, token refresh di cookie khusus." },
    { title: "Hak akses per peran", body: "Peserta, panitia, dan penyelenggara hanya dapat membuka data miliknya." },
    { title: "Kuota atomik", body: "Pemesanan memakai transaksi basis data sehingga kuota tidak pernah terlampaui." },
    { title: "Anti transaksi ganda", body: "Kunci idempotensi mencegah satu pesanan tercatat dua kali." },
    { title: "Pembatasan permintaan", body: "Percobaan masuk dan pengiriman email dibatasi untuk mencegah penyalahgunaan." },
    { title: "Check-in sekali pakai", body: "Satu tiket hanya dapat dipindai satu kali, meskipun dipindai bersamaan." },
  ],
};

export const team = [
  {
    name: "Marcelinus Dinoglide Yoga Prakoso",
    nim: "24/535330/TK/59377",
    tasks: ["Struktur awal dan desain antarmuka", "Katalog dan detail acara", "Checkout dan pembayaran Midtrans", "Pesanan dan pengembalian dana"],
  },
  {
    name: "Garjita Adicandra",
    nim: "24/540062/TK/59896",
    tasks: ["Klien API dan autentikasi", "Pendaftaran, masuk, dan atur ulang kata sandi", "Profil, pengguna, dan log audit", "Deployment dan README"],
  },
  {
    name: "Rasyid Rayhan Novandy",
    nim: "24/533842/TK/59152",
    tasks: ["Daftar tiket dan e-tiket", "Pemindai tiket untuk panitia", "Daftar peserta dan laporan kehadiran", "Materi presentasi"],
  },
  {
    name: "Debert Jamie Chanderson",
    nim: "24/545518/TK/60688",
    tasks: ["Pengelolaan acara", "Tipe tiket dan kuota", "Penugasan panitia", "Laporan penjualan dan video"],
  },
];

export const tech = [
  { group: "Frontend", items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4"] },
  { group: "Backend", items: ["Node.js dan Express 5", "MongoDB Atlas", "Mongoose", "Zod"] },
  { group: "Integrasi", items: ["Midtrans Snap", "Google Sign-In", "Supabase Storage", "SMTP Email"] },
  { group: "Deployment & Pengujian", items: ["Vercel dan Azure", "GitHub Actions", "Postman dan Newman", "node:test"] },
];

export type Shot = { file: string; chapter: string; title: string; body: string; url: string };

// Urutan demo mengikuti alur pengguna: peserta, panitia, lalu penyelenggara.
export const demo: Shot[] = [
  { file: "01-beranda", chapter: "Peserta", title: "Beranda", body: "Halaman utama menampilkan acara terdekat dalam bentuk tiket yang dapat digeser.", url: "passgo / beranda" },
  { file: "02-kategori", chapter: "Peserta", title: "Kategori dan Filter", body: "Acara dapat disaring berdasarkan waktu, harga, dan kategori. Setiap kartu memuat tanggal, tempat, dan harga.", url: "passgo / beranda" },
  { file: "04-cari", chapter: "Peserta", title: "Pencarian", body: "Kolom pencarian menampilkan kategori populer dan acara terdekat sebelum pengguna mengetik.", url: "passgo / cari" },
  { file: "03-agenda", chapter: "Peserta", title: "Agenda", body: "Acara berikutnya dikelompokkan berdasarkan tanggal pelaksanaan.", url: "passgo / beranda" },
  { file: "05-detail", chapter: "Peserta", title: "Detail Acara", body: "Halaman detail memuat tanggal, waktu, lokasi, kategori, deskripsi, dan pilihan tiket.", url: "passgo / acara / konser-orkestra" },
  { file: "06-detail-tiket", chapter: "Peserta", title: "Pemilihan Tiket", body: "Peserta memilih jumlah tiket per tipe. Acara juga dapat disimpan, ditambahkan ke kalender, atau dibagikan.", url: "passgo / acara / konser-orkestra" },
  { file: "07-masuk", chapter: "Peserta", title: "Masuk ke Akun", body: "Pengguna masuk dengan email dan kata sandi, atau dengan akun Google.", url: "passgo / masuk" },
  { file: "09-pesanan", chapter: "Peserta", title: "Daftar Pesanan", body: "Status setiap pesanan ditampilkan. Pembayaran diproses oleh Midtrans dengan batas waktu 30 menit.", url: "passgo / pesanan" },
  { file: "08-tiket-saya", chapter: "Peserta", title: "Daftar Tiket", body: "Tiket yang sudah dibayar dipisahkan menjadi acara yang akan datang dan yang sudah lewat.", url: "passgo / tiket" },
  { file: "10-etiket", chapter: "Peserta", title: "E-Tiket", body: "E-tiket memuat kode QR dan kode 16 karakter. Nama pemegang tiket dapat diubah.", url: "passgo / tiket / detail" },
  { file: "17-staff-acara", chapter: "Panitia", title: "Acara yang Ditugaskan", body: "Panitia hanya dapat melihat acara yang ditugaskan kepadanya.", url: "passgo / panitia" },
  { file: "18-scanner", chapter: "Panitia", title: "Pemindaian Tiket", body: "Kamera membaca kode QR, lalu sistem menampilkan hasilnya: diterima, sudah digunakan, atau tidak berlaku.", url: "passgo / pindai" },
  { file: "11-org-acara", chapter: "Penyelenggara", title: "Daftar Acara", body: "Penyelenggara melihat seluruh acara beserta statusnya: draf, terbit, selesai, atau dibatalkan.", url: "passgo / kelola / acara" },
  { file: "16-org-buat", chapter: "Penyelenggara", title: "Pembuatan Acara", body: "Penyelenggara mengisi detail, lokasi, jadwal, dan poster. Acara baru disimpan sebagai draf.", url: "passgo / kelola / acara baru" },
  { file: "12-org-tipe-tiket", chapter: "Penyelenggara", title: "Tipe Tiket dan Kuota", body: "Harga, kuota, dan masa penjualan diatur per tipe tiket. Sistem mencegah penjualan melebihi kuota.", url: "passgo / kelola / tipe tiket" },
  { file: "14-org-peserta", chapter: "Penyelenggara", title: "Daftar Peserta", body: "Penyelenggara dapat mencari peserta, melakukan check-in manual, dan mengunduh data dalam format CSV atau XLSX.", url: "passgo / kelola / peserta" },
  { file: "13-org-penjualan", chapter: "Penyelenggara", title: "Laporan Penjualan", body: "Laporan memuat pendapatan, jumlah tiket terjual, dan grafik pendapatan harian.", url: "passgo / kelola / penjualan" },
  { file: "15-org-pesanan", chapter: "Penyelenggara", title: "Pesanan dan Pengembalian Dana", body: "Seluruh pesanan dapat dipantau, termasuk pesanan yang memerlukan pengembalian dana.", url: "passgo / kelola / pesanan" },
];

export const chapterSubtitle: Record<string, string> = {
  Peserta: "Mencari acara, membeli tiket, dan menerima e-tiket.",
  Panitia: "Memeriksa tiket di lokasi acara.",
  Penyelenggara: "Mengelola acara, tiket, peserta, dan penjualan.",
};

export const phone = {
  title: "Tampilan Seluler",
  body: "Antarmuka menyesuaikan layar ponsel, dengan navigasi di bagian bawah dan tombol pembelian yang tetap terlihat.",
  files: ["19-hp-beranda", "20-hp-detail"],
};
