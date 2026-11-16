"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { homeFor, safeNext, useAuth } from "@/lib/auth";
import { text, useSubmit } from "@/lib/use-submit";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = use(searchParams);
  const target = safeNext(typeof next === "string" ? next : null);
  const { status, user, login } = useAuth();
  const router = useRouter();

  // Sudah login (mis. buka /login dari tab lama) → langsung ke tujuan.
  useEffect(() => {
    if (status === "authenticated") router.replace(target ?? homeFor(user!.role));
  }, [status, user, target, router]);

  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    await login(text(form, "email") ?? "", String(form.get("password") ?? ""));
  });

  return (
    <AuthCard
      title="Masuk"
      subtitle="Masuk untuk membeli tiket dan melihat tiket Anda."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            Daftar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field name="email" label="Email" type="email" autoComplete="email" required error={fieldErrors.email} />
        <Field name="password" label="Password" type="password" autoComplete="current-password" required error={fieldErrors.password} />
        <Link href="/forgot-password" className="-mt-1 self-end text-sm font-semibold text-navy hover:text-brand">
          Lupa password?
        </Link>
        <FormError>{error}</FormError>
        <Button type="submit" loading={loading}>
          Masuk
        </Button>
      </form>
    </AuthCard>
  );
}
