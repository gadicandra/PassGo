import { AppError } from "./app-error";

// Kontrak §6: tidak dikirim / `*` → 428 (kebijakan PassGo). Nilai lain dibandingkan strong; `W/"…"` atau format rusak tidak pernah cocok → null → 412.
export function ifMatchVersion(header: string | undefined): number | null {
  const value = header?.trim();
  if (!value || value === "*") throw new AppError(428, "precondition-required", "If-Match wajib dikirim.");
  const match = /^"(\d+)"$/.exec(value);
  return match ? Number(match[1]) : null;
}

export function assertVersion(expected: number | null, currentVersion: number, current: unknown): asserts expected is number {
  if (expected !== currentVersion) throw preconditionFailed(current);
}

export function preconditionFailed(current: unknown): AppError {
  return new AppError(412, "precondition-failed", "Data telah diubah oleh pengguna lain.", current === undefined ? {} : { current });
}
