"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/api/auth";

/** Bagian kanan header: tombol Masuk/Daftar untuk tamu, menu akun setelah login. */
export function AccountNav() {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const link = "text-[15px] font-semibold text-cream/75 hover:text-cream";

  if (status === "loading") return <div className="h-10 w-40" aria-hidden />;

  if (status === "guest" || !user) {
    return (
      <div className="flex items-center gap-3 md:gap-5">
        <Link href="/tickets" className={`${link} hidden sm:block`}>
          Tiket saya
        </Link>
        <ButtonLink href="/login" variant="outline-light" size="sm" className="md:h-10">
          Masuk
        </ButtonLink>
        <ButtonLink href="/register" size="sm" className="hidden sm:inline-flex md:h-10">
          Daftar
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 md:gap-5">
      {user.role === "ATTENDEE" && (
        <>
          <Link href="/tickets" className={`${link} hidden sm:block`}>
            Tiket saya
          </Link>
          <Link href="/orders" className={link}>
            Pesanan
          </Link>
        </>
      )}
      {user.role === "ORGANIZER" && (
        <Link href="/organizer/orders" className={link}>
          Kelola
        </Link>
      )}
      {user.role === "STAFF" && (
        <Link href="/staff" className={link}>
          Acara saya
        </Link>
      )}
      <span className="hidden max-w-32 truncate text-[15px] text-cream md:block">{user.name}</span>
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push("/");
        }}
        className={link}
      >
        Keluar
      </button>
    </div>
  );
}
