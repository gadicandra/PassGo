import type { EventSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { posterSrc } from "@/lib/categories";
import { dateParts } from "@/lib/format";

// Poster CSS 4:5 dari desain Stitch: blok warna solid + 2-3 kata kunci judul + foto duotone di zona sendiri.
// Judul tidak pernah menimpa foto dan tidak pernah terpotong tepi.

type PosterEvent = Pick<EventSummary, "id" | "title" | "startAt" | "timezone" | "posterUrl" | "status" | "salesStatus">;
type Size = "sm" | "md" | "lg";

// `fade`: gradasi warna yang sama di atas foto, supaya judul tetap terbaca di poster berfoto.
const palettes = [
  { bg: "bg-brand", fg: "text-cream", fade: "from-brand via-brand/75" },
  { bg: "bg-navy", fg: "text-sun", fade: "from-navy via-navy/75" },
  { bg: "bg-sun", fg: "text-navy", fade: "from-sun via-sun/80" },
  { bg: "bg-teal", fg: "text-cream", fade: "from-teal via-teal/75" },
] as const;

const titleSize: Record<Size, string> = {
  sm: "text-[min(12px,10cqw)]",
  // Ikut lebar poster (cqw) supaya kata panjang seperti "KERONCONG" tidak terpotong di kartu sempit (grid 2 kolom HP).
  md: "text-[min(28px,12cqw)]",
  lg: "text-[min(30px,12.5cqw)]",
};

const padding: Record<Size, string> = { sm: "p-2.5", md: "p-4", lg: "p-5" };

const stopwords = new Set(["dan", "untuk", "di", "ke", "dari", "bersama", "yang", "dengan", "the", "of", "&", "-", ":"]);

/** Ambil 2-3 kata yang paling "berbunyi" dari judul untuk ditulis besar di poster. */
export function posterWords(title: string): string[] {
  const words = title
    .replace(/[:,.]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !stopwords.has(word.toLowerCase()));
  const take = words.slice(0, 3).some((word) => word.length > 9) ? 2 : 3;
  return words.slice(0, take);
}

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/**
 * Warna poster sebuah acara. Default stabil per id; kirim `tone` (mis. indeks di grid)
 * supaya poster yang bersebelahan tidak pernah berwarna sama. Dipakai juga oleh hero & header detail.
 */
export function posterPalette(event: Pick<EventSummary, "id" | "status">, tone?: number) {
  if (event.status === "CANCELLED") return { bg: "bg-cream", fg: "text-navy", fade: "from-cream via-cream/85" };
  return palettes[(tone ?? hash(event.id)) % palettes.length];
}

export function Poster({
  event,
  size = "md",
  tone,
  stock = true,
  shape = "portrait",
  className,
}: {
  event: PosterEvent;
  size?: Size;
  /** Indeks warna; lihat posterPalette. */
  tone?: number;
  /** Tanpa poster unggahan: pakai foto stok kategori. Matikan di pratinjau unggah organizer. */
  stock?: boolean;
  /** "banner" = lanskap 2:1 untuk kartu katalog (pola kartu Loket); "portrait" = poster 4:5. */
  shape?: "portrait" | "banner";
  className?: string;
}) {
  const cancelled = event.status === "CANCELLED";
  const soldOut = !cancelled && event.salesStatus === "SOLD_OUT";
  const palette = posterPalette(event, tone);
  const { day, month } = dateParts(event.startAt, event.timezone);

  const title = (
    <p
      className={cn(
        "font-display font-extrabold uppercase leading-[0.92] tracking-[-0.03em] break-words",
        shape === "banner" ? "text-[min(24px,7cqw)]" : titleSize[size],
        palette.fg,
      )}
    >
      {posterWords(event.title).map((word, index) => (
        <span key={index} className="block">
          {word}
        </span>
      ))}
    </p>
  );

  const src = stock ? posterSrc(event) : event.posterUrl;

  return (
    <div
      role="img"
      aria-label={`Poster ${event.title}`}
      className={cn(
        "@container relative flex w-full flex-col overflow-hidden rounded-card border border-navy/15",
        shape === "banner" ? "aspect-[2/1]" : "aspect-[4/5]",
        palette.bg,
        className,
      )}
    >
      {/* Poster berfoto: foto penuh, gradasi warna palet dari bawah supaya judul terbaca (pola poster Loket). */}
      {src && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- poster bisa dari Supabase, /uploads backend, atau foto stok */}
          <img
            src={src}
            alt=""
            loading="lazy"
            className={cn(
              "absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105",
              cancelled && "grayscale opacity-60",
            )}
          />
          {/* Banner: gradasi dari kiri (di belakang judul) supaya sisi kanan foto tetap jelas. */}
          <span aria-hidden className={cn("absolute inset-0 to-transparent", shape === "banner" ? "bg-gradient-to-r" : "bg-gradient-to-t", palette.fade)} />
        </>
      )}

      {soldOut && (
        <span className="absolute -right-9 top-5 z-10 rotate-45 bg-navy px-10 py-1 font-display text-[11px] font-extrabold tracking-[0.15em] text-cream">
          HABIS
        </span>
      )}

      <div className={cn("relative flex flex-1 flex-col justify-between gap-2", padding[size])}>
        <DateBlock day={day} month={month} size={size} muted={cancelled} />
        {title}
      </div>
    </div>
  );
}

export function DateBlock({
  day,
  month,
  size = "md",
  muted = false,
}: {
  day: string;
  month: string;
  size?: Size;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "self-start rounded text-center font-display font-extrabold shadow-sm",
        muted ? "bg-navy/10 text-navy/60" : "bg-cream text-navy",
        size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1",
      )}
    >
      <span className={cn("block leading-none", size === "sm" ? "text-[14px]" : "text-[20px]")}>{day}</span>
      <span className={cn("mt-0.5 block leading-none tracking-wider", size === "sm" ? "text-[8px]" : "text-[9px]")}>
        {month.toUpperCase()}
      </span>
    </div>
  );
}
