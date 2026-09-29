import { createHash } from "node:crypto";
import { AppError } from "./app-error";

// Kontrak §4.2: cursor opak, terikat pada filter. Isinya id terakhir + sidik jari filter; filter berbeda → 422 cursor-invalid.
function fingerprint(filters: Record<string, unknown>): string {
  const canonical = JSON.stringify(Object.keys(filters).sort().map((key) => [key, filters[key]]));
  return createHash("sha256").update(canonical).digest("base64url").slice(0, 16);
}

export function encodeCursor(lastId: string, filters: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify({ id: lastId, f: fingerprint(filters) })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined, filters: Record<string, unknown>): string | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { id?: unknown; f?: unknown };
    if (typeof parsed.id === "string" && parsed.f === fingerprint(filters)) return parsed.id;
  } catch { /* jatuh ke 422 di bawah */ }
  throw new AppError(422, "cursor-invalid", "Cursor tidak valid untuk filter ini.", { errors: [{ parameter: "cursor", detail: "Cursor tidak valid." }] });
}

// Ambil limit+1 dokumen berurutan id desc, lalu bentuk meta §4.2.
export function cursorPage<T extends { id: string }>(rows: T[], limit: number, filters: Record<string, unknown>) {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(data[data.length - 1].id, filters) : null;
  return { data, meta: { limit, nextCursor, hasMore, appliedFilters: filters } };
}
