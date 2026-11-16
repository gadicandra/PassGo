// Input waktu di form organizer selalu dalam zona acara, bukan zona perangkat (kontrak §1: Zona waktu).
// <input type="datetime-local"> tidak tahu zona, jadi konversinya dilakukan di sini.

export const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB (Asia/Jakarta)" },
  { value: "Asia/Makassar", label: "WITA (Asia/Makassar)" },
  { value: "Asia/Jayapura", label: "WIT (Asia/Jayapura)" },
];

/** Selisih menit zona terhadap UTC pada saat `date` (positif = di depan UTC). */
function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((wall - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** ISO UTC → "2026-10-10T09:00" sesuai jam dinding di zona acara. "" bila kosong. */
export function toLocalInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + offsetMinutes(date, timeZone) * 60000).toISOString().slice(0, 16);
}

/** "2026-10-10T09:00" (jam dinding zona acara) → ISO UTC. null bila kosong/tidak valid. */
export function fromLocalInput(local: string, timeZone: string): string | null {
  if (!local) return null;
  const guess = Date.parse(`${local}:00Z`);
  if (Number.isNaN(guess)) return null;
  let result = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  // Ulangi sekali untuk jam di sekitar pergantian DST (tidak ada di Indonesia, tapi zona lain diterima backend).
  result = guess - offsetMinutes(new Date(result), timeZone) * 60000;
  return new Date(result).toISOString();
}
