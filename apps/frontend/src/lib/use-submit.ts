"use client";

import { useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "./api";

/**
 * State standar form: loading, error umum (untuk <FormError>), dan error per field dari 422 (untuk <Field error>).
 * const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => { ... });
 * Pesan khusus: throw new UserError("…") dari dalam action.
 */
export function useSubmit(action: (form: FormData) => Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await action(new FormData(event.currentTarget));
    } catch (caught) {
      const fields = caught instanceof ApiError ? caught.fieldErrors() : {};
      setFieldErrors(fields);
      // Bila semua error sudah tampil per field, kotak error umum tidak perlu.
      if (Object.keys(fields).length === 0) setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return { onSubmit, loading, error, fieldErrors };
}

/** Ambil string dari FormData; string kosong → undefined. */
export function text(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? undefined : value;
}
