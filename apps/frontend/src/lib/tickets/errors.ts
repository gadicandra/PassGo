import { ApiError } from "@/lib/api/client";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function validationMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null;
  return error.problem.errors?.[0]?.detail ?? error.message;
}
