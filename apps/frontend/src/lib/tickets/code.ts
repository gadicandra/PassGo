const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX = "PASSGO1:";

export type ParsedCode = { ok: true; code: string } | { ok: false; message: string };

export function parseManualCode(input: string): ParsedCode {
  let value = input.trim();
  if (!value) return { ok: false, message: "Isi kode tiket dulu." };
  if (value.toUpperCase().startsWith(PREFIX)) value = value.slice(PREFIX.length);
  const normalized = value.replace(/[\s-]/g, "").toUpperCase().replaceAll("O", "0").replace(/[IL]/g, "1");
  if (normalized.length !== 16) return { ok: false, message: "Kode tiket terdiri dari 16 huruf dan angka, mis. 7K2M-9XDQ-4R8B-3N5P." };
  if (![...normalized].every((char) => ALPHABET.includes(char))) {
    return { ok: false, message: "Kode hanya boleh berisi huruf dan angka." };
  }
  return { ok: true, code: normalized };
}

export const MAX_CODE_LENGTH = 64;
