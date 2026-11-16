import { z } from "zod";

// Kontrak §9.2: 8–64 karakter DAN ≤ 72 byte UTF-8 (bcrypt diam-diam memotong sisanya).
export const password = z
  .string()
  .min(8)
  .max(64)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password maksimal 72 byte (huruf non-latin dihitung lebih dari 1).");

/** "0812-3456 7890" / "62812…" / "+62812…" → "+62812…". Bukan nomor Indonesia → null (ditolak di schema). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, "");
  const normalized = digits.startsWith("+62") ? digits : digits.startsWith("62") ? `+${digits}` : digits.startsWith("0") ? `+62${digits.slice(1)}` : digits;
  return /^\+62[0-9]{8,13}$/.test(normalized) ? normalized : null;
}

// Nullable: string kosong setelah trim → null (kontrak §1).
export const phone = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value, context) => {
    if (value === undefined || value === null || value === "") return value === undefined ? undefined : null;
    const normalized = normalizePhone(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Nomor HP harus nomor Indonesia, mis. 0812xxxxxxxx." });
      return z.NEVER;
    }
    return normalized;
  });
