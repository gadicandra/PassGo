export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    detail: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(detail);
  }
}
