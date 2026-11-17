"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/organizer/events", label: "Acara" },
  { href: "/organizer/orders", label: "Pesanan" },
  { href: "/organizer/users", label: "Pengguna" },
  { href: "/organizer/audit-logs", label: "Log audit" },
];

export function OrganizerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Kelola" className="border-b border-line">
      <div className="mx-auto flex max-w-[1200px] gap-8 overflow-x-auto px-4 md:px-8">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-[3px] py-4 text-[15px] font-semibold transition-colors",
                active ? "border-brand text-navy" : "border-transparent text-muted hover:text-navy",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
