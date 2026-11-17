import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

// 16px di HP: iOS Safari memperbesar halaman bila huruf kolom isian < 16px saat diketuk.
const control =
  "w-full rounded-md border border-navy/25 bg-white px-3 text-base text-navy placeholder:text-muted md:text-[15px] " +
  "transition-colors focus:border-navy focus:outline-none disabled:bg-navy/5 disabled:text-muted " +
  "aria-[invalid=true]:border-danger";

interface FieldShell {
  /** Wajib, dipakai juga sebagai id input kalau `id` tidak diisi. */
  name: string;
  label: string;
  /** Pesan error validasi. Kalau ada, input diberi border merah dan dibacakan screen reader. */
  error?: string;
  /** Teks bantuan abu-abu di bawah input. Pakai hanya kalau mencegah salah isi. */
  hint?: ReactNode;
  className?: string;
}

function Shell({
  id,
  label,
  error,
  hint,
  className,
  children,
}: Omit<FieldShell, "name"> & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function Field({
  name,
  label,
  error,
  hint,
  className,
  id = name,
  ...input
}: FieldShell & Omit<ComponentProps<"input">, "name">) {
  return (
    <Shell id={id} label={label} error={error} hint={hint} className={className}>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, "h-11")}
        {...input}
      />
    </Shell>
  );
}

export function TextArea({
  name,
  label,
  error,
  hint,
  className,
  id = name,
  rows = 4,
  ...input
}: FieldShell & Omit<ComponentProps<"textarea">, "name">) {
  return (
    <Shell id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, "py-2.5")}
        {...input}
      />
    </Shell>
  );
}

export function Select({
  name,
  label,
  error,
  hint,
  className,
  id = name,
  children,
  ...input
}: FieldShell & Omit<ComponentProps<"select">, "name">) {
  return (
    <Shell id={id} label={label} error={error} hint={hint} className={className}>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, "h-11")}
        {...input}
      >
        {children}
      </select>
    </Shell>
  );
}

/** Kotak error di atas tombol submit, untuk error dari API yang bukan milik satu field. */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
      {children}
    </div>
  );
}
