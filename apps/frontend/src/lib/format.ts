// Format tampilan yang dipakai semua halaman. Zona waktu selalu dari data acara (default WIB).

const DEFAULT_TZ = "Asia/Jakarta";
const number = new Intl.NumberFormat("id-ID");

/** 75000 → "Rp75.000", 0 → "Gratis". */
export function formatRupiah(amount: number, { freeLabel = true } = {}): string {
  if (amount === 0 && freeLabel) return "Gratis";
  return `Rp${number.format(amount)}`;
}

/** "Sab, 10 Okt 2026" */
export function formatDate(iso: string, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** "Sabtu, 10 Oktober 2026" */
export function formatDateLong(iso: string, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** "09.00" */
export function formatTime(iso: string, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

/** "Sab, 10 Okt 2026 · 09.00 WIB" */
export function formatDateTime(iso: string, timeZone = DEFAULT_TZ): string {
  return `${formatDate(iso, timeZone)} · ${formatTime(iso, timeZone)} ${zoneLabel(timeZone)}`;
}

/** Angka hari & bulan pendek untuk blok tanggal di poster: { day: "10", month: "Okt" }. */
export function dateParts(iso: string, timeZone = DEFAULT_TZ) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("id-ID", { day: "numeric", timeZone }).format(date),
    month: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone }).format(date),
  };
}

function zoneLabel(timeZone: string): string {
  if (timeZone === "Asia/Jakarta") return "WIB";
  if (timeZone === "Asia/Makassar") return "WITA";
  if (timeZone === "Asia/Jayapura") return "WIT";
  return timeZone;
}
