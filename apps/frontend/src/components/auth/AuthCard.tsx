import type { ReactNode } from "react";

/** Kartu tengah untuk halaman masuk/daftar/reset. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-12 md:py-16">
      <div className="rounded-xl border border-line bg-white p-6 shadow-card md:p-8">
        <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.02em] text-navy">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-6 text-center text-[15px] text-muted">{footer}</p>}
    </section>
  );
}
