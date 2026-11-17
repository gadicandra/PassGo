import { z } from "zod";

// Pesan validasi tampil apa adanya di form FE (errors[].detail), jadi harus Bahasa Indonesia yang wajar.
// Locale `id` bawaan Zod untuk kasus sisa; yang sering muncul di form ditulis ulang di sini.
z.config(z.locales.id());
z.config({
  customError: (issue) => {
    const string = issue.origin === "string";
    if (issue.code === "too_small" && string) {
      return Number(issue.minimum) <= 1 ? "Wajib diisi." : `Minimal ${issue.minimum} karakter.`;
    }
    if (issue.code === "too_big" && string) return `Maksimal ${issue.maximum} karakter.`;
    if (issue.code === "invalid_format" && issue.format === "email") return "Format email tidak valid.";
    if (issue.code === "invalid_type" && issue.input === undefined) return "Wajib diisi.";
    return undefined;
  },
});
