// Isi acara contoh untuk demo lewat API (bukan langsung ke DB), supaya semua validasi backend tetap berlaku.
// Jalankan saat backend hidup: npm run db:seed:demo
// Login memakai SEED_ORGANIZER_EMAIL / SEED_ORGANIZER_PASSWORD dari .env. Acara yang judulnya sudah ada dilewati.

const API = (process.env.SEED_API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, "") + "/api/v1";

interface TicketSeed {
  name: string;
  description?: string;
  price: number;
  quota: number;
  /** Hari dari sekarang saat penjualan dibuka; negatif = sudah dibuka. Default: sudah dibuka. */
  salesOpensInDays?: number;
  maxPerOrder?: number;
}

interface EventSeed {
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  /** "YYYY-MM-DD", jam dalam WIB. */
  date: string;
  start: string;
  end: string;
  capacity?: number;
  tickets: TicketSeed[];
}

const maps = (query: string) => `https://maps.google.com/?q=${encodeURIComponent(query)}`;

const events: EventSeed[] = [
  {
    title: "Workshop Cetak Cukil",
    description:
      "Belajar teknik cetak cukil dari nol: membuat sketsa, memindahkan gambar ke papan lino, mencukil dengan aman, sampai mencetak di atas kertas seni.\n\nAlat dan bahan disediakan. Hasil cetak dan papan lino boleh dibawa pulang.",
    venueName: "Ruang Kreatif Kotabaru",
    venueAddress: "Jl. Faridan M. Noto No. 21, Kotabaru, Yogyakarta",
    date: "2026-11-21", start: "09:00", end: "13:00", capacity: 60,
    tickets: [
      { name: "Presale", description: "Termasuk totebag", price: 75000, quota: 20 },
      { name: "Reguler", price: 100000, quota: 30 },
      { name: "VIP", description: "Kit cukil pribadi + sesi konsultasi", price: 150000, quota: 10, maxPerOrder: 2 },
    ],
  },
  {
    title: "Lapak Zine Kotabaru",
    description:
      "Pasar zine, komik fotokopi, dan cetakan risograph dari kolektif se-Jogja. Datang, baca, tukar, beli langsung dari pembuatnya.",
    venueName: "Ruang Kreatif Kotabaru",
    venueAddress: "Jl. Faridan M. Noto No. 21, Kotabaru, Yogyakarta",
    date: "2026-11-21", start: "13:00", end: "18:00", capacity: 300,
    tickets: [{ name: "Masuk", price: 0, quota: 300, maxPerOrder: 4 }],
  },
  {
    title: "Malam Puisi dan Akustik",
    description: "Pembacaan puisi dan musik akustik di halaman kedai. Kursi terbatas, datang lebih awal.",
    venueName: "Kedai Kebun Forum",
    venueAddress: "Jl. Tirtodipuran No. 3, Mantrijeron, Yogyakarta",
    date: "2026-11-22", start: "19:30", end: "22:00", capacity: 60,
    tickets: [{ name: "Reguler", price: 35000, quota: 60 }],
  },
  {
    title: "Konser Orkestra Simfoni Kota",
    description:
      "Orkestra komunitas Yogyakarta membawakan Dvořák Simfoni No. 9 \"From the New World\" dan aransemen orkestra lagu-lagu daerah Nusantara.\n\nPintu dibuka 30 menit sebelum konser. Anak di bawah 7 tahun belum diperkenankan masuk.",
    venueName: "Concert Hall Taman Budaya Yogyakarta",
    venueAddress: "Jl. Sriwedani No. 1, Gondomanan, Yogyakarta",
    date: "2026-11-27", start: "19:00", end: "21:30", capacity: 500,
    tickets: [
      { name: "Balkon", price: 120000, quota: 200 },
      { name: "Tribun", price: 200000, quota: 220 },
      { name: "VIP", description: "Baris depan + temu pemain setelah konser", price: 350000, quota: 80, maxPerOrder: 4 },
    ],
  },
  {
    title: "Kelas Sablon Manual",
    description: "Kelas dasar sablon manual: membuat film, afdruk screen, hingga menyablon kaos sendiri.",
    venueName: "Krack Studio Kotabaru",
    venueAddress: "Jl. Kranggan No. 12, Jetis, Yogyakarta",
    date: "2026-11-28", start: "14:00", end: "17:00", capacity: 24,
    tickets: [{ name: "Reguler", description: "Termasuk satu kaos polos", price: 120000, quota: 24, salesOpensInDays: 3 }],
  },
  {
    title: "Pasar Seni Minggu Pagi",
    description: "Pasar seni terbuka: keramik, tenun, ilustrasi, dan jajanan pagi dari pelaku lokal.",
    venueName: "Taman Budaya Kotabaru",
    venueAddress: "Jl. Suroto, Kotabaru, Yogyakarta",
    date: "2026-11-29", start: "07:00", end: "11:00", capacity: 500,
    tickets: [{ name: "Masuk", price: 0, quota: 500, maxPerOrder: 6 }],
  },
  {
    title: "Pemutaran Film Pendek Jogja",
    description: "Program pemutaran enam film pendek karya sineas muda Yogyakarta, diikuti diskusi bersama sutradara.",
    venueName: "Bioskop Sonobudoyo",
    venueAddress: "Jl. Pangurakan No. 6, Gondomanan, Yogyakarta",
    date: "2026-12-04", start: "19:00", end: "21:30", capacity: 90,
    tickets: [{ name: "Reguler", price: 25000, quota: 90 }],
  },
  {
    title: "Gitar Klasik Malam Minggu",
    description: "Resital gitar klasik: Tárrega, Villa-Lobos, sampai aransemen keroncong untuk gitar tunggal.",
    venueName: "Kedai Kebun Forum",
    venueAddress: "Jl. Tirtodipuran No. 3, Mantrijeron, Yogyakarta",
    date: "2026-12-05", start: "19:30", end: "21:30", capacity: 70,
    tickets: [
      { name: "Presale", price: 40000, quota: 30 },
      { name: "Reguler", price: 50000, quota: 40 },
    ],
  },
  {
    title: "Kelas Keramik untuk Pemula",
    description: "Membentuk keramik dengan teknik pinch dan coil. Hasil karya dibakar dan bisa diambil dua minggu kemudian.",
    venueName: "Studio Tanah Liat Kotabaru",
    venueAddress: "Jl. Yos Sudarso No. 7, Kotabaru, Yogyakarta",
    date: "2026-12-05", start: "10:00", end: "13:00", capacity: 16,
    tickets: [{ name: "Reguler", description: "Termasuk tanah liat dan pembakaran", price: 150000, quota: 16, maxPerOrder: 2 }],
  },
  {
    title: "Diskusi Buku: Menulis Kota dari Pinggir Bersama Komunitas Literasi Kotabaru",
    description: "Diskusi santai tentang menulis kota dari sudut pandang warga, bersama penulis dan pegiat literasi lokal.",
    venueName: "Kolektif Indie Book Corner",
    venueAddress: "Jl. Cik Di Tiro No. 18, Terban, Yogyakarta",
    date: "2026-12-06", start: "10:00", end: "12:00", capacity: 50,
    tickets: [{ name: "Masuk", price: 0, quota: 50, maxPerOrder: 2 }],
  },
  {
    title: "Orkes Keroncong Senja",
    description: "Orkes keroncong membawakan lagu-lagu lawas dan aransemen baru di pendopo, ditemani teh dan jajanan pasar.",
    venueName: "Pendopo Ndalem Notoprajan",
    venueAddress: "Jl. Notoprajan No. 2, Ngampilan, Yogyakarta",
    date: "2026-12-12", start: "16:00", end: "18:30", capacity: 120,
    tickets: [
      { name: "Lesehan", price: 45000, quota: 70 },
      { name: "Kursi", price: 60000, quota: 50 },
    ],
  },
];

let token = "";

async function api<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${JSON.stringify(json)}`);
  return (json as { data: T }).data;
}

const at = (date: string, time: string) => `${date}T${time}:00+07:00`;
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

async function main() {
  const email = process.env.SEED_ORGANIZER_EMAIL;
  const password = process.env.SEED_ORGANIZER_PASSWORD;
  if (!email || !password) throw new Error("SEED_ORGANIZER_EMAIL dan SEED_ORGANIZER_PASSWORD wajib diisi di .env");

  ({ accessToken: token } = await api<{ accessToken: string }>("POST", "/auth/login", { email, password }));

  for (const seed of events) {
    const existing = await api<Array<{ title: string }>>("GET", `/events?when=all&pageSize=100&q=${encodeURIComponent(seed.title.slice(0, 40))}`);
    if (existing.some((event) => event.title === seed.title && (event as { status?: string }).status !== "CANCELLED")) {
      console.log(`lewati   ${seed.title} (sudah ada)`);
      continue;
    }

    const startAt = at(seed.date, seed.start);
    const event = await api<{ id: string; slug: string }>("POST", "/events", {
      title: seed.title,
      description: seed.description,
      venueName: seed.venueName,
      venueAddress: seed.venueAddress,
      mapsUrl: maps(`${seed.venueName}, ${seed.venueAddress}`),
      startAt,
      endAt: at(seed.date, seed.end),
      timezone: "Asia/Jakarta",
      capacity: seed.capacity ?? null,
      maxTicketsPerUser: 4,
    });

    for (const [index, ticket] of seed.tickets.entries()) {
      await api("POST", `/events/${event.id}/ticket-types`, {
        name: ticket.name,
        description: ticket.description ?? null,
        price: ticket.price,
        quota: ticket.quota,
        salesStartAt: daysFromNow(ticket.salesOpensInDays ?? -1),
        salesEndAt: startAt,
        maxPerOrder: ticket.maxPerOrder ?? 5,
        isActive: true,
        sortOrder: index,
      });
    }

    const fresh = await api<{ version: number }>("GET", `/events/${event.id}`);
    await api("POST", `/events/${event.id}/publish`, undefined, { "If-Match": `"${fresh.version}"` });
    console.log(`terbit   ${seed.title} → /events/${event.slug}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
