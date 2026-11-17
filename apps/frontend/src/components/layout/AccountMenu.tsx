"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/types/api";

const links: Record<Role, Array<{ href: string; label: string }>> = {
  ATTENDEE: [
    { href: "/tickets", label: "Tiket saya" },
    { href: "/orders", label: "Pesanan saya" },
  ],
  STAFF: [{ href: "/staff", label: "Acara saya" }],
  ORGANIZER: [
    { href: "/organizer/events", label: "Acara" },
    { href: "/organizer/orders", label: "Pesanan" },
    { href: "/organizer/users", label: "Pengguna" },
    { href: "/organizer/audit-logs", label: "Log audit" },
  ],
};

const item = "block rounded-md px-3 py-2 text-[15px] text-navy hover:bg-navy/5";

/** Kanan header: tombol Masuk/Daftar untuk tamu, menu akun untuk yang login. */
export function AccountMenu() {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  // Placeholder ukuran tetap selama cek sesi, agar header tidak melompat.
  if (status === "loading") return <div className="h-9 w-24 md:h-10" aria-hidden />;

  if (status === "guest") {
    return (
      <>
        <ButtonLink href="/login" variant="outline-light" size="sm" className="md:h-10">
          Masuk
        </ButtonLink>
        <ButtonLink href="/register" size="sm" className="hidden sm:inline-flex md:h-10">
          Daftar
        </ButtonLink>
      </>
    );
  }

  // <details> native: buka/tutup dan keyboard tanpa JS tambahan.
  return (
    <details className="group relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border-[1.5px] border-cream/40 px-3 text-sm font-semibold text-cream hover:border-cream md:h-10 [&::-webkit-details-marker]:hidden">
        <span className="max-w-[10ch] truncate sm:max-w-[16ch]">{user!.name}</span>
        <span aria-hidden className="transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div
        className="absolute right-0 mt-2 w-56 rounded-lg bg-white p-2 shadow-card-hover"
        onClick={(event) => (event.currentTarget.parentElement as HTMLDetailsElement).removeAttribute("open")}
      >
        {links[user!.role].map((link) => (
          <Link key={link.href} href={link.href} className={item}>
            {link.label}
          </Link>
        ))}
        <Link href="/profile" className={item}>
          Profil
        </Link>
        <button
          type="button"
          className={`${item} w-full text-left text-danger`}
          onClick={async () => {
            await logout().catch(() => {});
            router.replace("/");
          }}
        >
          Keluar
        </button>
      </div>
    </details>
  );
}
