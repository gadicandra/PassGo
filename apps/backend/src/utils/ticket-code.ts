import { randomBytes } from "node:crypto";

// Crockford base32 (tanpa I, L, O, U) — tahan salah baca saat diketik manual di pintu masuk.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const QR_PREFIX = "PASSGO1:";

export function generateTicketCode(): string {
  return [...randomBytes(16)].map((byte) => ALPHABET[byte & 31]).join("");
}

export const qrPayload = (code: string) => `${QR_PREFIX}${code}`;

export function formatTicketCode(code: string): string {
  return code.match(/.{1,4}/g)!.join("-");
}

export function maskTicketCode(code: string): string {
  return `••••-••••-••••-${code.slice(-4)}`;
}

// Kontrak §9.12: buang prefiks versi, spasi/`-`, huruf besar, O→0, I/L→1. Prefiks tak dikenal → null (dianggap tidak ditemukan).
export function normalizeTicketCode(input: string): { code: string | null; tail: string } {
  let value = input.trim();
  const prefix = /^([A-Za-z0-9]+):/.exec(value);
  if (prefix) {
    if (prefix[0].toUpperCase() !== QR_PREFIX) return { code: null, tail: lastFour(value.slice(prefix[0].length)) };
    value = value.slice(prefix[0].length);
  }
  const normalized = value.replace(/[\s-]/g, "").toUpperCase().replaceAll("O", "0").replace(/[IL]/g, "1");
  const valid = normalized.length === 16 && [...normalized].every((char) => ALPHABET.includes(char));
  return { code: valid ? normalized : null, tail: lastFour(normalized) };
}

function lastFour(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase().slice(-4);
}
