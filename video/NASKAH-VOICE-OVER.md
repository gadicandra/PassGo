# Naskah Voice Over Video PassGo

Total 9 menit 42 detik. Cap waktu sama persis dengan video `passgo-demo.mp4`, jadi rekaman tiap bagian bisa langsung ditempel di posisi itu.
Pembicara adalah usulan berdasarkan pembagian tugas, silakan ditukar. Kecepatan baca yang pas sekitar 2 kata per detik.
Tanda ⚠ berarti teksnya padat untuk durasinya: bacalah sedikit lebih cepat.

## 0:00–0:12  Pembukaan  (12 detik, Marcelinus)

Assalamualaikum warahmatullahi wabarakatuh. Kami Kelompok 10 mata kuliah Pemrograman Aplikasi Web, mempresentasikan PassGo, aplikasi penjualan tiket untuk acara komunitas.

## 0:12–0:52  Latar Belakang  (40 detik, Marcelinus)

Banyak acara komunitas, seperti lokakarya, pameran, dan pertunjukan kecil, masih menjual tiket secara manual. Pertama, panitia harus memeriksa bukti transfer satu per satu melalui pesan singkat. Kedua, rekap pembeli di spreadsheet membuat kuota sulit dijaga, sehingga tiket dapat terjual melebihi kapasitas tempat. Ketiga, tiket yang hanya berupa gambar atau nama di daftar sulit diperiksa keasliannya di pintu masuk. PassGo dibuat untuk menyelesaikan ketiga masalah tersebut.

## 0:51–1:26  Pengenalan Aplikasi  (35 detik, Marcelinus)

PassGo adalah aplikasi web untuk menjual tiket acara komunitas. Aplikasi ini mencakup tiga bagian utama. Pembelian tiket, yaitu peserta memilih acara dan tipe tiket, lalu membayar melalui QRIS, dompet digital, atau transfer bank. E-tiket, yaitu tiket yang sudah dibayar langsung tersimpan di akun peserta dan dilengkapi kode QR. Terakhir, pengelolaan acara, yaitu panitia memindai tiket di lokasi, sedangkan penyelenggara memantau penjualan dan kehadiran.

## 1:26–2:06  Pembagian Tugas  (40 detik, Garjita)

Pengerjaan aplikasi dibagi kepada empat anggota. Marcelinus mengerjakan struktur awal dan desain antarmuka, katalog dan detail acara, proses checkout dengan Midtrans, serta pesanan dan pengembalian dana. Garjita mengerjakan klien API dan autentikasi, halaman pendaftaran dan masuk, profil, pengelolaan pengguna, log audit, serta deployment. Rasyid mengerjakan daftar tiket dan e-tiket, pemindai tiket untuk panitia, daftar peserta, dan laporan kehadiran. Debert mengerjakan pengelolaan acara, tipe tiket dan kuota, penugasan panitia, serta laporan penjualan.

## 2:05–2:40  Teknologi yang Digunakan  (35 detik, Garjita)

Bagian frontend dibangun dengan Next.js versi 16 dan React 19, menggunakan TypeScript dan Tailwind CSS. Bagian backend menggunakan Node.js dengan Express versi 5, basis data MongoDB Atlas melalui Mongoose, serta Zod untuk validasi data. Untuk integrasi, kami menggunakan Midtrans Snap untuk pembayaran, Google Sign-In untuk login, Supabase Storage untuk poster acara, dan SMTP untuk pengiriman email. Aplikasi berjalan di Azure App Service dan dideploy otomatis lewat GitHub Actions, dengan Postman dan node test untuk pengujian.

## 2:40–3:20  Arsitektur Sistem  (40 detik, Garjita)

Arsitektur PassGo memisahkan frontend dan backend. Pengguna, baik peserta, panitia, maupun penyelenggara, mengakses aplikasi melalui browser. Browser hanya berkomunikasi dengan satu alamat, yaitu frontend Next.js. Frontend kemudian meneruskan permintaan API ke backend Express. Cara ini membuat cookie login tetap aman karena tidak dikirim lintas domain. Backend menyimpan seluruh data di MongoDB Atlas. Selain itu, backend terhubung dengan empat layanan, yaitu Midtrans untuk pembayaran dan notifikasi, Google untuk login, Supabase untuk menyimpan poster, dan SMTP untuk mengirim email tiket dan verifikasi akun.

## 3:19–3:57  Alur Pemesanan dan Pembayaran  (38 detik, Marcelinus)

Flowchart ini menunjukkan proses pemesanan. Setelah peserta memilih tiket, sistem memeriksa kuota. Jika tidak cukup, pesanan ditolak. Jika cukup, kuota ditahan dan pesanan dibuat dengan batas bayar 30 menit. Jika pembayaran Midtrans masuk sebelum batas waktu, pesanan ditandai lunas dan e-tiket dikirim ke email. Jika tidak, pesanan kedaluwarsa dan kuotanya dilepas untuk pembeli lain.

## 3:57–4:35  Alur Check-in  (38 detik, Rasyid)

Saat panitia memindai QR, server memeriksa lima hal secara berurutan: kode dikenal, tiket untuk acara ini, jam check-in sudah buka, tiket masih berlaku, dan tiket belum pernah dipakai. Setiap kegagalan menghasilkan pesan yang berbeda. Pemeriksaan terakhir bersifat atomik, jadi satu tiket tidak bisa dipakai masuk dua kali walaupun dipindai bersamaan.

## 4:34–5:06  Alur Pengajuan Penyelenggara  (32 detik, Debert)

Peserta yang ingin menjual tiket mengisi formulir Jadi Penyelenggara. Jika akun masih punya tiket aktif, pengajuan ditolak sistem. Jika tidak, pengajuan menunggu peninjauan superadmin. Jika disetujui, perannya menjadi penyelenggara dan bisa langsung membuat acara. Jika ditolak, peserta melihat catatannya dan boleh mengajukan ulang.

## 5:06–5:11  Demo: Peserta  (5 detik, Marcelinus)

Selanjutnya kami memperagakan aplikasi, dimulai dari sisi peserta.

## 5:10–5:23  Beranda  (13 detik, Marcelinus)

Ini adalah halaman utama PassGo. Bagian atas menampilkan acara terdekat dalam bentuk tiket yang dapat digeser. Di bawahnya terdapat filter dan kategori untuk menelusuri acara.

## 5:23–5:36  Kategori dan Filter  (13 detik, Marcelinus)

Peserta dapat menyaring acara berdasarkan waktu, yaitu minggu ini atau bulan ini, serta acara gratis. Setiap kartu acara memuat foto, tanggal, waktu, tempat, dan harga mulai.

## 5:35–5:48  Pencarian  (13 detik, Marcelinus)

Saat kolom pencarian dipilih, sistem langsung menampilkan kategori yang banyak dicari dan tiga acara terdekat. Peserta juga dapat mengetik judul acara atau nama tempat.

## 5:48–6:01  Agenda  (13 detik, Marcelinus)

Bagian agenda menampilkan acara berikutnya yang dikelompokkan berdasarkan tanggal pelaksanaan. Setiap kartu memuat jam, tempat, dan harga.

## 6:00–6:13  Detail Acara  (13 detik, Marcelinus)

Halaman detail menampilkan tanggal, waktu, lokasi, dan kategori acara. Tab di bagian atas memudahkan peserta berpindah ke deskripsi, pilihan tiket, atau lokasi.

## 6:13–6:26  Pemilihan Tiket  (13 detik, Marcelinus)

Peserta memilih jumlah tiket untuk setiap tipe, dengan batas maksimal per akun. Acara juga dapat disimpan, ditambahkan ke Google Calendar, atau dibagikan melalui media sosial.

## 6:25–6:38  Masuk ke Akun  (13 detik, Marcelinus)

Untuk membeli tiket, peserta harus masuk terlebih dahulu. Peserta dapat masuk dengan email dan kata sandi, atau langsung menggunakan akun Google.

## 6:38–6:51  Daftar Pesanan  (13 detik, Marcelinus)

Halaman ini menampilkan status setiap pesanan. Pembayaran diproses oleh Midtrans, dan pesanan ditahan selama tiga puluh menit sampai peserta menyelesaikan pembayaran.

## 6:50–7:03  Daftar Tiket  (13 detik, Marcelinus)

Setelah pembayaran berhasil, tiket langsung muncul di halaman ini. Tiket dipisahkan menjadi acara yang akan datang dan acara yang sudah lewat.

## 7:03–7:16  E-Tiket  (13 detik, Marcelinus)

Setiap e-tiket memuat kode QR dan kode enam belas karakter. Kode inilah yang dipindai panitia di pintu masuk. Nama pemegang tiket juga dapat diubah, misalnya bila tiket dibelikan untuk teman.

## 7:15–7:20  Demo: Panitia  (5 detik, Rasyid)

Berikutnya adalah alur dari sisi panitia.

## 7:20–7:33  Acara yang Ditugaskan  (13 detik, Rasyid)

Panitia hanya dapat melihat acara yang ditugaskan oleh penyelenggara. Dari halaman ini panitia dapat membuka pemindai atau daftar peserta.

## 7:32–7:45  Pemindaian Tiket  (13 detik, Rasyid)

Kamera membaca kode QR pada e-tiket, lalu sistem langsung menampilkan hasilnya, yaitu diterima, sudah digunakan, atau tidak berlaku. Bila kamera tidak dapat dipakai, kode tiket dapat diketik secara manual.

## 7:45–7:50  Demo: Penyelenggara  (5 detik, Debert)

Terakhir, alur dari sisi penyelenggara.

## 7:49–8:02  Daftar Acara  (13 detik, Debert)

Penyelenggara melihat seluruh acara beserta statusnya, yaitu draf, terbit, selesai, atau dibatalkan, lengkap dengan jumlah tiket yang terjual.

## 8:02–8:15  Pembuatan Acara  (13 detik, Debert)

Penyelenggara mengisi judul, deskripsi, tempat, jadwal, dan poster acara. Acara baru disimpan sebagai draf dan baru terlihat di katalog setelah diterbitkan.

## 8:14–8:27  Tipe Tiket dan Kuota  (13 detik, Debert)

Setiap acara dapat memiliki beberapa tipe tiket. Harga, kuota, dan masa penjualan diatur per tipe, dan sistem mencegah penjualan melebihi kuota.

## 8:27–8:40  Daftar Peserta  (13 detik, Debert)

Penyelenggara dapat mencari peserta, melakukan check-in secara manual, dan mengunduh daftar peserta dalam format CSV atau XLSX.

## 8:39–8:52  Laporan Penjualan  (13 detik, Debert)

Laporan penjualan menampilkan pendapatan bersih, jumlah tiket terjual per tipe, dan grafik pendapatan harian.

## 8:52–9:05  Pesanan dan Pengembalian Dana  (13 detik, Debert)

Penyelenggara dapat memantau seluruh pesanan yang masuk, termasuk pesanan yang memerlukan pengembalian dana, misalnya karena acara dibatalkan.

## 9:04–9:22  Tampilan Seluler  (18 detik, Debert)

Antarmuka PassGo juga menyesuaikan layar ponsel. Navigasi utama berada di bagian bawah layar, kartu acara dapat digeser ke samping, dan tombol pembelian tetap terlihat saat peserta membaca detail acara.

## 9:22–9:42  Penutup  (20 detik, Debert)

Demikian presentasi dan demo aplikasi PassGo dari Kelompok 10. Kode sumber beserta dokumentasi tersedia di repositori GitHub kami, dan aplikasi dapat dicoba melalui tautan web yang tertera. Terima kasih atas perhatiannya. Wassalamualaikum warahmatullahi wabarakatuh.
