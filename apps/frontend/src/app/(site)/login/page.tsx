import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

// Halaman masuk sementara supaya alur beli bisa dites. Adi: ganti tampilan & tambahkan daftar/reset sesuai desain 5B.
export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = (await searchParams).next;
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 md:px-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] md:text-[56px]">Masuk</h1>
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
