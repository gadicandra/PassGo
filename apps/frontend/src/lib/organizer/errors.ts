// Pemetaan error API ke pesan form. Pakai `code` untuk logika, `detail` hanya untuk ditampilkan (kontrak §3).

import { ApiError } from "@/lib/api/client";

/** errors[].pointer ("#/endAt", "/poster") → { endAt: "…" }. Hanya segmen pertama yang dipakai. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !Array.isArray(error.problem.errors)) return {};
  const result: Record<string, string> = {};
  for (const item of error.problem.errors) {
    const field = item.pointer?.replace(/^#?\//, "").split("/")[0];
    if (field && !result[field]) result[field] = item.detail;
  }
  return result;
}

const messages: Record<string, string> = {
  "network-error": "Tidak ada koneksi. Coba lagi.",
  "precondition-failed": "Data ini baru saja diubah di tab atau perangkat lain. Data terbaru sudah dimuat; periksa lalu coba lagi.",
  "event-not-editable": "Acara yang sudah dibatalkan atau berakhir tidak bisa diubah.",
  "event-not-draft": "Acara ini sudah tidak berstatus draf.",
  "event-not-deletable": "Hanya draf tanpa pesanan yang bisa dihapus.",
  "event-not-cancellable": "Hanya acara terbit yang belum berakhir yang bisa dibatalkan.",
  "capacity-exceeded": "Total kuota tipe tiket melebihi kapasitas acara.",
  "ticket-type-name-taken": "Nama tipe tiket ini sudah dipakai di acara ini.",
  "ticket-type-not-deletable": "Tipe tiket ini sudah pernah dipesan. Nonaktifkan saja supaya penjualan berhenti.",
  "user-not-staff": "Akun ini bukan panitia aktif.",
  "payload-too-large": "Berkas poster maksimal 2 MB.",
  "unsupported-media-type": "Poster harus JPEG, PNG, atau WebP.",
  "poster-too-small": "Poster minimal 600 × 600 piksel.",
  "storage-error": "Penyimpanan poster sedang gangguan. Coba lagi sebentar.",
  "rate-limited": "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  forbidden: "Akun kamu tidak punya akses ke aksi ini.",
};

/** Pesan satu baris untuk FormError/toast. */
export function errorMessage(error: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "quota-below-sold" && typeof error.problem.minimumQuota === "number") {
    return `Kuota tidak boleh di bawah ${error.problem.minimumQuota} (tiket yang sudah terjual dan sedang dipesan).`;
  }
  return messages[error.code] ?? error.problem.detail ?? fallback;
}

/** Representasi terbaru dari body 412 (`current`), bila ada. */
export function currentFrom<T>(error: unknown): T | null {
  if (error instanceof ApiError && error.code === "precondition-failed" && error.problem.current) {
    return error.problem.current as T;
  }
  return null;
}
