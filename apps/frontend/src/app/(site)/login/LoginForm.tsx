"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useAuth } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function LoginForm({ next }: { next: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const found: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) found.email = "Masukkan email yang valid.";
    if (!password) found.password = "Password wajib diisi.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.replace(next !== "/" ? next : user.role === "ORGANIZER" ? "/organizer/orders" : "/");
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError && error.code === "invalid-credentials"
            ? "Email atau password salah."
            : error instanceof ApiError
              ? error.message
              : "Gagal masuk. Coba lagi.",
      });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex max-w-[360px] flex-col gap-4">
      <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <Field name="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
      <FormError>{errors.form}</FormError>
      <Button type="submit" loading={submitting} className="w-40">
        Masuk
      </Button>
      <p className="text-[15px]">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold underline underline-offset-4 hover:text-brand">
          Daftar
        </Link>
      </p>
    </form>
  );
}
