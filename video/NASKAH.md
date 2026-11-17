# Naskah Narasi Video PassGo

Total durasi video ± 9 menit 34 detik (batas tugas 10 menit). Naskah dibacakan sesuai urutan adegan.
Panjang tiap bagian sudah disesuaikan dengan durasinya, dengan kecepatan baca sekitar 2 kata per detik.
Bila narasi lebih panjang atau pendek, ubah durasi adegan di `src/PassGoDemo.tsx`.

## 1. Pembukaan (12 detik)

Assalamualaikum warahmatullahi wabarakatuh, selamat pagi atau siang. Kami dari Kelompok 10 mata kuliah Pemrograman Aplikasi Web. Pada video ini kami mempresentasikan PassGo, aplikasi penjualan tiket untuk acara komunitas.

## 2. Latar Belakang (40 detik)

Banyak acara komunitas, seperti lokakarya, pameran, dan pertunjukan kecil, masih menjual tiket secara manual. Pertama, panitia harus memeriksa bukti transfer satu per satu melalui pesan singkat. Kedua, rekap pembeli di spreadsheet membuat kuota sulit dijaga, sehingga tiket dapat terjual melebihi kapasitas tempat. Ketiga, tiket yang hanya berupa gambar atau nama di daftar sulit diperiksa keasliannya di pintu masuk. PassGo dibuat untuk menyelesaikan ketiga masalah tersebut.

## 3. Pengenalan Aplikasi (35 detik)

PassGo adalah aplikasi web untuk menjual tiket acara komunitas. Aplikasi ini mencakup tiga bagian utama. Pembelian tiket, yaitu peserta memilih acara dan tipe tiket, lalu membayar melalui QRIS, dompet digital, atau transfer bank. E-tiket, yaitu tiket yang sudah dibayar langsung tersimpan di akun peserta dan dilengkapi kode QR. Terakhir, pengelolaan acara, yaitu panitia memindai tiket di lokasi, sedangkan penyelenggara memantau penjualan dan kehadiran.

## 4. Pembagian Tugas (40 detik)

Pengerjaan aplikasi dibagi kepada empat anggota. Marcelinus mengerjakan struktur awal dan desain antarmuka, katalog dan detail acara, proses checkout dengan Midtrans, serta pesanan dan pengembalian dana. Garjita mengerjakan klien API dan autentikasi, halaman pendaftaran dan masuk, profil, pengelolaan pengguna, log audit, serta deployment. Rasyid mengerjakan daftar tiket dan e-tiket, pemindai tiket untuk panitia, daftar peserta, dan laporan kehadiran. Debert mengerjakan pengelolaan acara, tipe tiket dan kuota, penugasan panitia, serta laporan penjualan.

## 5. Teknologi yang Digunakan (40 detik)

Bagian frontend dibangun dengan Next.js versi 16 dan React 19, menggunakan TypeScript dan Tailwind CSS. Bagian backend menggunakan Node.js dengan Express versi 5, basis data MongoDB Atlas melalui Mongoose, serta Zod untuk validasi data. Untuk integrasi, kami menggunakan Midtrans Snap untuk pembayaran, Google Sign-In untuk login, Supabase Storage untuk poster acara, dan SMTP untuk pengiriman email. Aplikasi dijalankan di Vercel dan Azure, dengan GitHub Actions, Postman, dan node test untuk pengujian.

## 6. Arsitektur Sistem (45 detik)

Arsitektur PassGo memisahkan frontend dan backend. Pengguna, baik peserta, panitia, maupun penyelenggara, mengakses aplikasi melalui browser. Browser hanya berkomunikasi dengan satu alamat, yaitu frontend Next.js. Frontend kemudian meneruskan permintaan API ke backend Express. Cara ini membuat cookie login tetap aman karena tidak dikirim lintas domain. Backend menyimpan seluruh data di MongoDB Atlas. Selain itu, backend terhubung dengan empat layanan, yaitu Midtrans untuk pembayaran dan notifikasi, Google untuk login, Supabase untuk menyimpan poster, dan SMTP untuk mengirim email tiket dan verifikasi akun.

## 7. Keamanan dan Keandalan (35 detik)

Kami menerapkan beberapa mekanisme keamanan. Token akses berumur pendek disimpan di memori, sedangkan token refresh disimpan di cookie khusus. Setiap peran hanya dapat membuka data miliknya. Pemesanan memakai transaksi basis data sehingga kuota tidak pernah terlampaui. Kunci idempotensi mencegah satu pesanan tercatat dua kali. Percobaan masuk dan pengiriman email dibatasi. Terakhir, setiap tiket hanya dapat dipindai satu kali.

## 8. Demo Aplikasi: Peserta

**Judul bab (5 detik).** Selanjutnya kami memperagakan aplikasi, dimulai dari sisi peserta.

**Beranda (16 detik).** Ini adalah halaman utama PassGo. Bagian atas menampilkan acara terdekat dalam bentuk tiket yang dapat digeser. Di bawahnya terdapat filter dan kategori untuk menelusuri acara.

**Kategori dan Filter (16 detik).** Peserta dapat menyaring acara berdasarkan waktu, yaitu minggu ini atau bulan ini, serta acara gratis. Setiap kartu acara memuat foto, tanggal, waktu, tempat, dan harga mulai.

**Pencarian (16 detik).** Saat kolom pencarian dipilih, sistem langsung menampilkan kategori yang banyak dicari dan tiga acara terdekat. Peserta juga dapat mengetik judul acara atau nama tempat.

**Agenda (16 detik).** Bagian agenda menampilkan acara berikutnya yang dikelompokkan berdasarkan tanggal pelaksanaan. Setiap kartu memuat jam, tempat, dan harga.

**Detail Acara (16 detik).** Halaman detail menampilkan tanggal, waktu, lokasi, dan kategori acara. Tab di bagian atas memudahkan peserta berpindah ke deskripsi, pilihan tiket, atau lokasi.

**Pemilihan Tiket (16 detik).** Peserta memilih jumlah tiket untuk setiap tipe, dengan batas maksimal per akun. Acara juga dapat disimpan, ditambahkan ke Google Calendar, atau dibagikan melalui media sosial.

**Masuk ke Akun (16 detik).** Untuk membeli tiket, peserta harus masuk terlebih dahulu. Peserta dapat masuk dengan email dan kata sandi, atau langsung menggunakan akun Google.

**Daftar Pesanan (16 detik).** Halaman ini menampilkan status setiap pesanan. Pembayaran diproses oleh Midtrans, dan pesanan ditahan selama tiga puluh menit sampai peserta menyelesaikan pembayaran.

**Daftar Tiket (16 detik).** Setelah pembayaran berhasil, tiket langsung muncul di halaman ini. Tiket dipisahkan menjadi acara yang akan datang dan acara yang sudah lewat.

**E-Tiket (16 detik).** Setiap e-tiket memuat kode QR dan kode enam belas karakter. Kode inilah yang dipindai panitia di pintu masuk. Nama pemegang tiket juga dapat diubah, misalnya bila tiket dibelikan untuk teman.

## 9. Demo Aplikasi: Panitia

**Judul bab (5 detik).** Berikutnya adalah alur dari sisi panitia.

**Acara yang Ditugaskan (16 detik).** Panitia hanya dapat melihat acara yang ditugaskan oleh penyelenggara. Dari halaman ini panitia dapat membuka pemindai atau daftar peserta.

**Pemindaian Tiket (16 detik).** Kamera membaca kode QR pada e-tiket, lalu sistem langsung menampilkan hasilnya, yaitu diterima, sudah digunakan, atau tidak berlaku. Bila kamera tidak dapat dipakai, kode tiket dapat diketik secara manual.

## 10. Demo Aplikasi: Penyelenggara

**Judul bab (5 detik).** Terakhir, alur dari sisi penyelenggara.

**Daftar Acara (16 detik).** Penyelenggara melihat seluruh acara beserta statusnya, yaitu draf, terbit, selesai, atau dibatalkan, lengkap dengan jumlah tiket yang terjual.

**Pembuatan Acara (16 detik).** Penyelenggara mengisi judul, deskripsi, tempat, jadwal, dan poster acara. Acara baru disimpan sebagai draf dan baru terlihat di katalog setelah diterbitkan.

**Tipe Tiket dan Kuota (16 detik).** Setiap acara dapat memiliki beberapa tipe tiket. Harga, kuota, dan masa penjualan diatur per tipe, dan sistem mencegah penjualan melebihi kuota.

**Daftar Peserta (16 detik).** Penyelenggara dapat mencari peserta, melakukan check-in secara manual, dan mengunduh daftar peserta dalam format CSV atau XLSX.

**Laporan Penjualan (16 detik).** Laporan penjualan menampilkan pendapatan bersih, jumlah tiket terjual per tipe, dan grafik pendapatan harian.

**Pesanan dan Pengembalian Dana (16 detik).** Penyelenggara dapat memantau seluruh pesanan yang masuk, termasuk pesanan yang memerlukan pengembalian dana, misalnya karena acara dibatalkan.

## 11. Tampilan Seluler (18 detik)

Antarmuka PassGo juga menyesuaikan layar ponsel. Navigasi utama berada di bagian bawah layar, kartu acara dapat digeser ke samping, dan tombol pembelian tetap terlihat saat peserta membaca detail acara.

## 12. Penutup (20 detik)

Demikian presentasi dan demo aplikasi PassGo dari Kelompok 10. Kode sumber beserta dokumentasi tersedia di repositori GitHub kami, dan aplikasi dapat dicoba melalui tautan web yang tertera. Terima kasih atas perhatiannya. Wassalamualaikum warahmatullahi wabarakatuh.
