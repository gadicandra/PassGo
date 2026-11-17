"use client";

import { use, useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { api, ApiError, UserError } from "@/lib/api";
import { useSubmit } from "@/lib/use-submit";

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const fromUrl = use(searchParams).token;
  // Simpan sekali di state, lalu buang dari URL agar tidak tersimpan di riwayat / ikut tersalin.
  // Router Next ikut membaca replaceState, jadi searchParams berikutnya kosong; state tetap memegang token.
  const [token] = useState(fromUrl);
  useEffect(() => {
    if (typeof fromUrl === "string") history.replaceState(null, "", location.pathname);
  }, [fromUrl]);
  const [done, setDone] = useState(false);
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== form.get("passwordConfirm")) throw new UserError("Konfirmasi password tidak sama.");
    try {
      await api("/auth/password-reset/confirm", { method: "POST", body: { token, newPassword } });
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "auth-token-invalid") throw new UserError("Tautan reset tidak berlaku atau sudah dipakai. Minta tautan baru.");
      throw caught;
    }
  });

  if (typeof token !== "string") {
    return (
      <AuthCard title="Tautan tidak lengkap" subtitle="Buka tautan reset dari email Anda, atau minta tautan baru.">
        <ButtonLink href="/forgot-password" variant="outline" className="w-full">
          Minta tautan baru
        </ButtonLink>
      </AuthCard>
    );
  }
  // Reset mencabut semua sesi (kontrak §9.2), jadi pengguna masuk ulang.
  if (done) {
    return (
      <AuthCard title="Password diganti" subtitle="Semua perangkat sudah dikeluarkan. Masuk dengan password baru.">
        <ButtonLink href="/login" className="w-full">
          Masuk
        </ButtonLink>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Buat password baru">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field name="newPassword" label="Password baru" type="password" autoComplete="new-password" required minLength={8} maxLength={64} hint="8–64 karakter." error={fieldErrors.newPassword} />
        <Field name="passwordConfirm" label="Ulangi password baru" type="password" autoComplete="new-password" required />
        <FormError>{error}</FormError>
        <Button type="submit" loading={loading}>
          Simpan password
        </Button>
      </form>
    </AuthCard>
  );
}
