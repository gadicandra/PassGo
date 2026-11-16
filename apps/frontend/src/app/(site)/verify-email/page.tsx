"use client";

import { use, useEffect, useRef, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { ButtonLink, Spinner } from "@/components/ui/Button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Tautan email → halaman ini → POST confirm. Bukan GET di API agar pemindai tautan email tidak memverifikasi (kontrak §9.2).
export default function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const fromUrl = use(searchParams).token;
  // Simpan sekali di state, lalu buang dari URL agar tidak tersimpan di riwayat / ikut tersalin.
  // Router Next ikut membaca replaceState, jadi searchParams berikutnya kosong; state tetap memegang token.
  const [token] = useState(fromUrl);
  useEffect(() => {
    if (typeof fromUrl === "string") history.replaceState(null, "", location.pathname);
  }, [fromUrl]);
  const { status, user, setUser } = useAuth();
  const [state, setState] = useState<"pending" | "done" | "failed">(typeof token === "string" ? "pending" : "failed");
  const [message, setMessage] = useState("Tautan verifikasi tidak lengkap.");
  const sent = useRef(false);

  useEffect(() => {
    // Token sekali pakai: Strict Mode menjalankan effect dua kali di dev, jadi kunci dengan ref.
    if (typeof token !== "string" || sent.current) return;
    sent.current = true;
    api("/auth/email-verification/confirm", { method: "POST", body: { token } })
      .then(() => setState("done"))
      .catch((error) => {
        setMessage(errorMessage(error));
        setState("failed");
      });
  }, [token]);

  useEffect(() => {
    if (state === "done" && user && !user.emailVerified) setUser({ ...user, emailVerified: true });
  }, [state, user, setUser]);

  if (state === "pending") {
    return (
      <AuthCard title="Memverifikasi email…">
        <Spinner className="size-6 text-navy" />
      </AuthCard>
    );
  }
  if (state === "done") {
    return (
      <AuthCard title="Email terverifikasi" subtitle="Akun Anda siap dipakai untuk membeli tiket.">
        <ButtonLink href={status === "authenticated" ? "/" : "/login"} className="w-full">
          {status === "authenticated" ? "Lihat acara" : "Masuk"}
        </ButtonLink>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Verifikasi gagal" subtitle={`${message} Minta tautan baru dari halaman profil.`}>
      <ButtonLink href={status === "authenticated" ? "/profile" : "/login"} variant="outline" className="w-full">
        {status === "authenticated" ? "Ke profil" : "Masuk"}
      </ButtonLink>
    </AuthCard>
  );
}
