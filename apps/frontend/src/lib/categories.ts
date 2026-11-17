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
  match: RegExp;
}

export const categories: Category[] = [
  { slug: "musik", label: "Musik & konser", icon: Music, tone: "bg-brand text-cream", match: /konser|musik|gitar|orkes|keroncong|akustik|band/i },
  { slug: "kelas", label: "Workshop & kelas", icon: Scissors, tone: "bg-teal text-cream", match: /workshop|kelas|lokakarya|sablon|cukil|keramik/i },
  { slug: "pasar", label: "Pasar & pameran", icon: Palette, tone: "bg-sun text-navy", match: /pasar|lapak|pameran|zine|bazar|seni/i },
  { slug: "film", label: "Film", icon: Clapperboard, tone: "bg-navy text-sun", match: /film|bioskop|pemutaran|sinema/i },
  { slug: "literasi", label: "Diskusi & literasi", icon: BookOpen, tone: "bg-cream text-navy ring-1 ring-navy/15", match: /diskusi|buku|puisi|literasi|baca|menulis/i },
];

export const categoryBySlug = (slug: unknown) => categories.find((category) => category.slug === slug);

export const inCategory = (category: Category) => (event: Pick<EventSummary, "title">) => category.match.test(event.title);
