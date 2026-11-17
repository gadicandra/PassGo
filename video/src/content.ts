// Semua teks video di satu tempat: ubah di sini tanpa menyentuh komponen adegan.

export const links = {
  repo: "https://github.com/gadicandra/PassGo",
  web: "https://passgo-web.azurewebsites.net",
};

export const intro = {
  subtitle: "Aplikasi Penjualan Tiket Acara Komunitas",
  // Dua baris, dipisah baris baru (bukan titik tengah).
  meta: ["Kelompok 10, Pemrograman Aplikasi Web 2026", "Universitas Gadjah Mada"].join("\n"),
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
    frontend: { title: "Frontend", body: "Next.js 16, Azure" },
    backend: { title: "REST API", body: "Express 5, Node.js" },
    database: { title: "Basis Data", body: "MongoDB Atlas" },
  },
  services: ["Midtrans: pembayaran dan notifikasi", "Google: login dengan akun Google", "Supabase: penyimpanan poster", "SMTP: email tiket dan verifikasi"],
};

/**
 * Flowchart bernotasi standar. Grid 6 kolom x 3 baris: c = kolom 0-5, r = baris 0-2.
 * kind: start/end = terminator, proc = proses, dec = keputusan, io = input.
 * tone (untuk end): ok = hijau, warn = kuning, bad = merah.
 */
export type FlowNode = { id: string; kind: "start" | "end" | "proc" | "dec" | "io"; c: number; r: number; label: string; tone?: "ok" | "warn" | "bad" };
export type FlowEdge = { from: string; to: string; label?: "Ya" | "Tidak" };
export type Flow = { title: string; caption: string; nodes: FlowNode[]; edges: FlowEdge[] };

export const orderFlow: Flow = {
  title: "Alur Pemesanan dan Pembayaran",
  caption: "Kuota diperiksa dan ditahan dalam satu transaksi. Status lunas berasal dari notifikasi Midtrans yang sudah diverifikasi.",
  nodes: [
    { id: "start", kind: "start", c: 0, r: 0, label: "Mulai" },
    { id: "pick", kind: "io", c: 0, r: 1, label: "Pilih tipe dan jumlah tiket" },
    { id: "quota", kind: "dec", c: 1, r: 1, label: "Kuota cukup?" },
    { id: "order", kind: "proc", c: 2, r: 1, label: "Tahan kuota, buat pesanan (batas 30 menit)" },
    { id: "pay", kind: "proc", c: 3, r: 1, label: "Peserta membayar di Midtrans" },
    { id: "paid", kind: "dec", c: 4, r: 1, label: "Lunas sebelum batas waktu?" },
    { id: "issue", kind: "proc", c: 5, r: 1, label: "Tandai lunas, terbitkan tiket" },
    { id: "mail", kind: "end", c: 5, r: 0, label: "E-tiket dikirim ke email", tone: "ok" },
    { id: "reject", kind: "end", c: 1, r: 2, label: "Pesanan ditolak", tone: "bad" },
    { id: "expire", kind: "end", c: 4, r: 2, label: "Kedaluwarsa, kuota dilepas", tone: "warn" },
  ],
  edges: [
    { from: "start", to: "pick" }, { from: "pick", to: "quota" }, { from: "quota", to: "order", label: "Ya" }, { from: "order", to: "pay" },
    { from: "pay", to: "paid" }, { from: "paid", to: "issue", label: "Ya" }, { from: "issue", to: "mail" },
    { from: "quota", to: "reject", label: "Tidak" }, { from: "paid", to: "expire", label: "Tidak" },
  ],
};

export const organizerFlow: Flow = {
  title: "Alur Pengajuan Penyelenggara",
  caption: "Hanya superadmin yang dapat meninjau pengajuan, dan setiap keputusan tercatat di log audit.",
  nodes: [
    { id: "start", kind: "start", c: 0, r: 0, label: "Mulai" },
    { id: "form", kind: "io", c: 0, r: 1, label: "Isi formulir Jadi Penyelenggara" },
    { id: "d1", kind: "dec", c: 1, r: 1, label: "Bebas tiket aktif?" },
    { id: "wait", kind: "proc", c: 2, r: 1, label: "Pengajuan menunggu peninjauan" },
    { id: "d2", kind: "dec", c: 3, r: 1, label: "Superadmin menyetujui?" },
    { id: "role", kind: "proc", c: 4, r: 1, label: "Peran menjadi penyelenggara" },
    { id: "done", kind: "end", c: 5, r: 1, label: "Membuat acara pertama", tone: "ok" },
    { id: "blocked", kind: "end", c: 1, r: 2, label: "Ditolak sistem", tone: "bad" },
    { id: "rejected", kind: "end", c: 3, r: 2, label: "Ditolak, boleh ajukan ulang", tone: "warn" },
  ],
  edges: [
    { from: "start", to: "form" }, { from: "form", to: "d1" }, { from: "d1", to: "wait", label: "Ya" }, { from: "wait", to: "d2" },
    { from: "d2", to: "role", label: "Ya" }, { from: "role", to: "done" },
    { from: "d1", to: "blocked", label: "Tidak" }, { from: "d2", to: "rejected", label: "Tidak" },
  ],
};

export const checkInFlow: Flow = {
  title: "Alur Check-in di Pintu Masuk",
  caption: "Pemeriksaan terakhir bersifat atomik. Jika dua panitia memindai tiket yang sama bersamaan, hanya satu yang diterima.",
  nodes: [
    { id: "start", kind: "start", c: 0, r: 0, label: "Mulai" },
    { id: "scan", kind: "io", c: 0, r: 1, label: "Pindai QR atau ketik kode" },
    { id: "d1", kind: "dec", c: 1, r: 1, label: "Kode dikenal?" },
    { id: "d2", kind: "dec", c: 2, r: 1, label: "Untuk acara ini?" },
    { id: "d3", kind: "dec", c: 3, r: 1, label: "Jam check-in sudah buka?" },
    { id: "d4", kind: "dec", c: 4, r: 1, label: "Tiket masih berlaku?" },
    { id: "d5", kind: "dec", c: 5, r: 1, label: "Belum pernah dipakai?" },
    { id: "ok", kind: "end", c: 5, r: 0, label: "Diterima, silakan masuk", tone: "ok" },
    { id: "e1", kind: "end", c: 1, r: 2, label: "Kode tidak dikenal", tone: "bad" },
    { id: "e2", kind: "end", c: 2, r: 2, label: "Tiket acara lain", tone: "bad" },
    { id: "e3", kind: "end", c: 3, r: 2, label: "Di luar jam check-in", tone: "warn" },
    { id: "e4", kind: "end", c: 4, r: 2, label: "Tiket tidak berlaku", tone: "bad" },
    { id: "e5", kind: "end", c: 5, r: 2, label: "Tiket sudah dipakai", tone: "warn" },
  ],
  edges: [
    { from: "start", to: "scan" }, { from: "scan", to: "d1" },
    { from: "d1", to: "d2", label: "Ya" }, { from: "d2", to: "d3", label: "Ya" }, { from: "d3", to: "d4", label: "Ya" }, { from: "d4", to: "d5", label: "Ya" },
    { from: "d5", to: "ok", label: "Ya" },
    { from: "d1", to: "e1", label: "Tidak" }, { from: "d2", to: "e2", label: "Tidak" }, { from: "d3", to: "e3", label: "Tidak" },
    { from: "d4", to: "e4", label: "Tidak" }, { from: "d5", to: "e5", label: "Tidak" },
  ],
};

export const team = [
  {
    name: "Marcelinus Dinoglide Yoga Prakoso",
    nim: "24/533842/TK/59152",
    tasks: ["Struktur awal dan desain antarmuka", "Katalog dan detail acara", "Checkout dan pembayaran Midtrans", "Pesanan dan pengembalian dana"],
  },
  {
    name: "Garjita Adicandra",
    nim: "24/535330/TK/59377",
    tasks: ["Klien API dan autentikasi", "Pendaftaran, masuk, dan atur ulang kata sandi", "Profil, pengguna, dan log audit", "Deployment dan README"],
  },
  {
    name: "Rasyid Rayhan Novandy",
    nim: "24/545518/TK/60688",
    tasks: ["Daftar tiket dan e-tiket", "Pemindai tiket untuk panitia", "Daftar peserta dan laporan kehadiran", "Materi presentasi"],
  },
  {
    name: "Debert Jamie Chanderson",
    nim: "24/540062/TK/59896",
    tasks: ["Pengelolaan acara", "Tipe tiket dan kuota", "Penugasan panitia", "Laporan penjualan dan video"],
  },
];

export const tech = [
  { group: "Frontend", items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4"] },
  { group: "Backend", items: ["Node.js dan Express 5", "MongoDB Atlas", "Mongoose", "Zod"] },
  { group: "Integrasi", items: ["Midtrans Snap", "Google Sign-In", "Supabase Storage", "SMTP Email"] },
  { group: "Deployment & Pengujian", items: ["Azure App Service", "GitHub Actions", "Postman dan Newman", "node:test"] },
];

/** `focus`: titik (persen x, y) yang didekati kamera selama layar tampil. */
export type Shot = { file: string; chapter: string; title: string; body: string; url: string; focus: [number, number] };

// Urutan demo mengikuti alur pengguna: peserta, panitia, lalu penyelenggara.
export const demo: Shot[] = [
  { file: "01-beranda", chapter: "Peserta", title: "Beranda", body: "Halaman utama menampilkan acara terdekat dalam bentuk tiket yang dapat digeser.", url: "passgo / beranda", focus: [50, 32] },
  { file: "02-kategori", chapter: "Peserta", title: "Kategori dan Filter", body: "Acara dapat disaring berdasarkan waktu, harga, dan kategori. Setiap kartu memuat tanggal, tempat, dan harga.", url: "passgo / beranda", focus: [50, 40] },
  { file: "04-cari", chapter: "Peserta", title: "Pencarian", body: "Kolom pencarian menampilkan kategori populer dan acara terdekat sebelum pengguna mengetik.", url: "passgo / cari", focus: [50, 22] },
  { file: "03-agenda", chapter: "Peserta", title: "Agenda", body: "Acara berikutnya dikelompokkan berdasarkan tanggal pelaksanaan.", url: "passgo / beranda", focus: [42, 48] },
  { file: "05-detail", chapter: "Peserta", title: "Detail Acara", body: "Halaman detail memuat tanggal, waktu, lokasi, kategori, deskripsi, dan pilihan tiket.", url: "passgo / acara / konser-orkestra", focus: [45, 32] },
  { file: "06-detail-tiket", chapter: "Peserta", title: "Pemilihan Tiket", body: "Peserta memilih jumlah tiket per tipe. Acara juga dapat disimpan, ditambahkan ke kalender, atau dibagikan.", url: "passgo / acara / konser-orkestra", focus: [72, 45] },
  { file: "07-masuk", chapter: "Peserta", title: "Masuk ke Akun", body: "Pengguna masuk dengan email dan kata sandi, atau dengan akun Google.", url: "passgo / masuk", focus: [50, 38] },
  { file: "09-pesanan", chapter: "Peserta", title: "Daftar Pesanan", body: "Status setiap pesanan ditampilkan. Pembayaran diproses oleh Midtrans dengan batas waktu 30 menit.", url: "passgo / pesanan", focus: [45, 22] },
  { file: "08-tiket-saya", chapter: "Peserta", title: "Daftar Tiket", body: "Tiket yang sudah dibayar dipisahkan menjadi acara yang akan datang dan yang sudah lewat.", url: "passgo / tiket", focus: [30, 35] },
  { file: "10-etiket", chapter: "Peserta", title: "E-Tiket", body: "E-tiket memuat kode QR dan kode 16 karakter. Nama pemegang tiket dapat diubah.", url: "passgo / tiket / detail", focus: [32, 42] },
  { file: "17-staff-acara", chapter: "Panitia", title: "Acara yang Ditugaskan", body: "Panitia hanya dapat melihat acara yang ditugaskan kepadanya.", url: "passgo / panitia", focus: [38, 40] },
  { file: "18-scanner", chapter: "Panitia", title: "Pemindaian Tiket", body: "Kamera membaca kode QR, lalu sistem menampilkan hasilnya: diterima, sudah digunakan, atau tidak berlaku.", url: "passgo / pindai", focus: [45, 48] },
  { file: "11-org-acara", chapter: "Penyelenggara", title: "Daftar Acara", body: "Penyelenggara melihat seluruh acara beserta statusnya: draf, terbit, selesai, atau dibatalkan.", url: "passgo / kelola / acara", focus: [50, 40] },
  { file: "16-org-buat", chapter: "Penyelenggara", title: "Pembuatan Acara", body: "Penyelenggara mengisi detail, lokasi, jadwal, dan poster. Acara baru disimpan sebagai draf.", url: "passgo / kelola / acara baru", focus: [38, 42] },
  { file: "12-org-tipe-tiket", chapter: "Penyelenggara", title: "Tipe Tiket dan Kuota", body: "Harga, kuota, dan masa penjualan diatur per tipe tiket. Sistem mencegah penjualan melebihi kuota.", url: "passgo / kelola / tipe tiket", focus: [42, 45] },
  { file: "14-org-peserta", chapter: "Penyelenggara", title: "Daftar Peserta", body: "Penyelenggara dapat mencari peserta, melakukan check-in manual, dan mengunduh data dalam format CSV atau XLSX.", url: "passgo / kelola / peserta", focus: [50, 38] },
  { file: "13-org-penjualan", chapter: "Penyelenggara", title: "Laporan Penjualan", body: "Laporan memuat pendapatan, jumlah tiket terjual, dan grafik pendapatan harian.", url: "passgo / kelola / penjualan", focus: [40, 40] },
  { file: "15-org-pesanan", chapter: "Penyelenggara", title: "Pesanan dan Pengembalian Dana", body: "Seluruh pesanan dapat dipantau, termasuk pesanan yang memerlukan pengembalian dana.", url: "passgo / kelola / pesanan", focus: [50, 32] },
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
