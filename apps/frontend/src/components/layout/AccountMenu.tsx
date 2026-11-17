"use client";

import Link from "next/link";
import { CalendarDays, ChevronDown, CircleUser, Heart, LogOut, Receipt, ScanLine, ScrollText, Ticket, UserRound, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/types/api";

const links: Record<Role, Array<{ href: string; label: string }>> = {
  ATTENDEE: [
    { href: "/tickets", label: "Tiket saya" },
    { href: "/orders", label: "Pesanan saya" },
    { href: "/disimpan", label: "Acara disimpan" },
  ],
  STAFF: [{ href: "/staff", label: "Acara saya" }],
  ORGANIZER: [
    { href: "/organizer/events", label: "Acara" },
    { href: "/organizer/orders", label: "Pesanan" },
    { href: "/organizer/users", label: "Pengguna" },
    { href: "/organizer/audit-logs", label: "Log audit" },
  ],
};

const item = "flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] text-navy hover:bg-navy/5";

// Ikon menu akun per tautan, supaya tiap baris cepat dikenali.
const menuIcon: Record<string, LucideIcon> = {
  "/tickets": Ticket,
  "/disimpan": Heart,
  "/orders": Receipt,
  "/staff": ScanLine,
  "/organizer/events": CalendarDays,
  "/organizer/orders": Receipt,
  "/organizer/users": Users,
  "/organizer/audit-logs": ScrollText,
};

/** Kanan header: tombol Masuk/Daftar untuk tamu, menu akun untuk yang login. */
export function AccountMenu() {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);

  // <details> tidak menutup sendiri saat Escape atau klik di luar menu: tutup manual.
  useEffect(() => {
    const close = () => menu.current?.removeAttribute("open");
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    const onClick = (event: MouseEvent) => !menu.current?.contains(event.target as Node) && close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

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
    <details ref={menu} className="group relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border-[1.5px] border-cream/40 px-3 text-sm font-semibold text-cream hover:border-cream md:h-10 [&::-webkit-details-marker]:hidden">
        <CircleUser aria-hidden className="size-[18px] shrink-0" />
        <span className="max-w-[10ch] truncate sm:max-w-[16ch]">{user!.name}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div
        className="absolute right-0 mt-2 w-56 rounded-lg bg-white p-2 shadow-card-hover"
        onClick={(event) => (event.currentTarget.parentElement as HTMLDetailsElement).removeAttribute("open")}
      >
        {links[user!.role].map((link) => {
          const Icon = menuIcon[link.href] ?? CircleUser;
          return (
            <Link key={link.href} href={link.href} className={item}>
              <Icon aria-hidden className="size-4 shrink-0 text-muted" />
              {link.label}
            </Link>
          );
        })}
        <Link href="/profile" className={item}>
          <UserRound aria-hidden className="size-4 shrink-0 text-muted" />
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
          <LogOut aria-hidden className="size-4 shrink-0" />
          Keluar
        </button>
      </div>
    </details>
  );
}
