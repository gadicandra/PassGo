import { BookOpen, Clapperboard, Music, Palette, Scissors, type LucideIcon } from "lucide-react";
import type { EventSummary } from "@/types/api";

// Acara belum punya kolom kategori, jadi kategori ditebak dari kata kunci judul.
// ponytail: berbasis judul; ganti dengan field `category` di model Event bila organizer perlu memilih sendiri.
export interface Category {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Kelas warna latar ilustrasi (token desain). */
  tone: string;
  /** Strip warna di bawah kartu kategori (pola kartu kota Loket). */
  strip: string;
  match: RegExp;
}

export const categories: Category[] = [
  { slug: "musik", label: "Musik & konser", icon: Music, tone: "bg-brand text-cream", strip: "from-brand to-sun", match: /konser|musik|gitar|orkes|keroncong|akustik|band/i },
  { slug: "kelas", label: "Workshop & kelas", icon: Scissors, tone: "bg-teal text-cream", strip: "from-teal to-[#5fb3a8]", match: /workshop|kelas|lokakarya|sablon|cukil|keramik/i },
  { slug: "pasar", label: "Pasar & pameran", icon: Palette, tone: "bg-sun text-navy", strip: "from-sun to-brand", match: /pasar|lapak|pameran|zine|bazar|seni/i },
  { slug: "film", label: "Film", icon: Clapperboard, tone: "bg-navy text-sun", strip: "from-navy to-[#4b6cb7]", match: /film|bioskop|pemutaran|sinema/i },
  { slug: "literasi", label: "Diskusi & literasi", icon: BookOpen, tone: "bg-cream text-navy ring-1 ring-navy/15", strip: "from-[#b7740a] to-sun", match: /diskusi|buku|puisi|literasi|baca|menulis/i },
];

export const categoryBySlug = (slug: unknown) => categories.find((category) => category.slug === slug);

export const inCategory = (category: Category) => (event: Pick<EventSummary, "title">) => category.match.test(event.title);

// Foto cadangan per kategori (Unsplash License, bebas dipakai) di public/posters, untuk acara tanpa poster sendiri.
const STOCK_VARIANTS = 2;

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/** Poster acara: unggahan organizer bila ada, kalau tidak foto stok sesuai kategori (variasi stabil per acara). */
export function posterSrc(event: Pick<EventSummary, "id" | "title" | "posterUrl">): string {
  if (event.posterUrl) return event.posterUrl;
  const category = categories.find((item) => item.match.test(event.title));
  if (!category) return "/posters/umum-1.webp";
  return `/posters/${category.slug}-${(hash(event.id) % STOCK_VARIANTS) + 1}.webp`;
}
