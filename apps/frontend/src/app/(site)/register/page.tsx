"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { homeFor, useAuth } from "@/lib/auth";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { api, UserError } from "@/lib/api";
import { text, useSubmit } from "@/lib/use-submit";

export default function RegisterPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { status, user } = useAuth();
  const router = useRouter();

  // Daftar lewat Google langsung menghasilkan sesi → arahkan ke halaman awal sesuai peran.
  useEffect(() => {
    if (status === "authenticated") router.replace(homeFor(user!.role));
  }, [status, user, router]);
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    const password = String(form.get("password") ?? "");
    if (password !== form.get("passwordConfirm")) throw new UserError("Konfirmasi password tidak sama.");
    const email = text(form, "email") ?? "";
    await api("/auth/register", { method: "POST", body: { name: text(form, "name") ?? "", email, phone: text(form, "phone") ?? null, password } });
    setSentTo(email);
  });

  // Server menjawab sama persis untuk email baru maupun terdaftar (anti enumeration), jadi pesannya juga sama.
  if (sentTo) {
    return (
      <AuthCard title="Cek email Anda" subtitle={<>Kami mengirim tautan verifikasi ke <strong className="text-navy">{sentTo}</strong>. Tautan berlaku 24 jam.</>}>
        <ButtonLink href="/login" className="w-full">
          Lanjut masuk
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Daftar"
      subtitle="Buat akun peserta untuk membeli tiket."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <GoogleButton text="signup_with" />
      <OrDivider />
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4" noValidate>
        <Field name="name" label="Nama lengkap" autoComplete="name" required minLength={2} maxLength={100} error={fieldErrors.name} />
        <Field name="email" label="Email" type="email" autoComplete="email" required error={fieldErrors.email} />
        <Field name="phone" label="Nomor HP (opsional)" type="tel" autoComplete="tel" placeholder="08…" error={fieldErrors.phone} />
        <Field name="password" label="Password" type="password" autoComplete="new-password" required minLength={8} maxLength={64} hint="8–64 karakter." error={fieldErrors.password} />
        <Field name="passwordConfirm" label="Ulangi password" type="password" autoComplete="new-password" required />
        <FormError>{error}</FormError>
        <Button type="submit" loading={loading}>
          Daftar
        </Button>
      </form>
    </AuthCard>
  );
}
