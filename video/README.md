# Video PassGo (Remotion)

Video presentasi & demo M2 (maks. 10 menit): latar belakang, pengenalan aplikasi, pembagian tugas, teknologi, arsitektur, keamanan, dan demo.
Durasi ± 9 menit 42 detik. Naskah narasi tiap adegan ada di `NASKAH.md`. Proyek ini terpisah dari workspace aplikasi.

```bash
cd video
npm install
npm run studio   # pratinjau & edit di browser (http://localhost:3000)
npm run render   # hasil: out/passgo-demo.mp4
```

- Semua teks (anggota, tugas, teknologi, keterangan tiap layar demo, tautan) ada di `src/content.ts`.
- Screenshot demo ada di `public/shots/` (1920×1080, HP 390×844). Ganti berkas dengan nama yang sama untuk memperbarui.
- Durasi tiap adegan diatur di `src/PassGoDemo.tsx` (`SHOT` = lama tiap layar demo).
- Narasi/suara: tambahkan `<Audio src={staticFile("narasi.mp3")} />` di `PassGoDemo`, atau gabungkan suara saat menyunting.
- `remotion.config.ts` memakai Chrome yang terpasang di Windows; ubah lokasinya bila berbeda.
