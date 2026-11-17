import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "outline" | "outline-light" | "text";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Satu tombol solid oranye per halaman. Sisanya dark/outline/text.
  primary: "bg-brand text-white hover:bg-brand-dark",
  dark: "bg-navy text-cream hover:bg-navy-soft",
  outline: "border-[1.5px] border-navy/30 text-navy hover:border-navy hover:bg-navy/5",
  // Untuk di atas latar navy (header, hero).
  "outline-light": "border-[1.5px] border-cream/40 text-cream hover:border-cream hover:bg-navy-soft",
  text: "text-navy underline-offset-4 hover:text-brand hover:underline",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-3.5 text-sm",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  /** Tampilkan spinner dan kunci tombol selama request berjalan. */
  loading?: boolean;
}

export function buttonClass({ variant = "primary", size = "md" }: StyleProps = {}) {
  return cn(base, variants[variant], variant !== "text" && sizes[size]);
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: StyleProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass({ variant, size }), className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** Tombol yang berupa link (navigasi), tampilannya sama dengan Button. */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={cn(buttonClass({ variant, size }), className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
