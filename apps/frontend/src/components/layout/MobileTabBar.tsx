"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleUser, House, ScanLine, Search, Ticket, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Awalan path yang membuat tab ini aktif. */
  match: string[];
}

/** Bilah navigasi bawah khusus HP (pola aplikasi tiket): Beranda, Cari, tab sesuai peran, Akun. */
export function MobileTabBar() {
  const pathname = usePathname();
  const { status, user } = useAuth();

  const roleTab: Tab =
    user?.role === "ORGANIZER"
      ? { href: "/organizer/events", label: "Kelola", icon: CalendarDays, match: ["/organizer"] }
      : user?.role === "STAFF"
        ? { href: "/staff", label: "Pindai", icon: ScanLine, match: ["/staff", "/scan"] }
        : { href: "/tickets", label: "Tiket", icon: Ticket, match: ["/tickets", "/orders"] };

  const tabs: Tab[] = [
    { href: "/", label: "Beranda", icon: House, match: [] },
    { href: "/cari", label: "Cari", icon: Search, match: ["/cari"] },
    roleTab,
    {
      href: status === "authenticated" ? "/profile" : "/login",
      label: status === "authenticated" ? "Akun" : "Masuk",
      icon: CircleUser,
      match: ["/profile", "/login", "/register"],
    },
  ];

  const isActive = (tab: Tab) => (tab.href === "/" ? pathname === "/" : tab.match.some((prefix) => pathname.startsWith(prefix)));

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <li key={tab.label}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  active ? "text-brand" : "text-muted hover:text-navy",
                )}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
