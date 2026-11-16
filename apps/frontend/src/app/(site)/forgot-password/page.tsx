"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { text, useSubmit } from "@/lib/use-submit";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    const email = text(form, "email") ?? "";
    await api("/auth/password-reset", { method: "POST", body: { email } });
    setSentTo(email);
  });

  return (
    <AuthCard
      title="Lupa password"
      subtitle={
        sentTo ? (
          <>Bila <strong className="text-navy">{sentTo}</strong> terdaftar, tautan reset sudah dikirim. Tautan berlaku 30 menit.</>
        ) : (
          "Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru."
        )
      }
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {!sentTo && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field name="email" label="Email" type="email" autoComplete="email" required error={fieldErrors.email} />
          <FormError>{error}</FormError>
          <Button type="submit" loading={loading}>
            Kirim tautan reset
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
