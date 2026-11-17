"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, errorMessage, type Session, UserError } from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { text, useSubmit } from "@/lib/use-submit";
import type { User } from "@/types/api";

const roleLabel = { ORGANIZER: "Penyelenggara", STAFF: "Panitia", ATTENDEE: "Peserta" } as const;

export default function ProfilePage() {
  return (
    <RequireAuth>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 md:px-8">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.01em] md:text-[36px]">Profil</h1>
        <ProfileForm />
        <PasswordForm />
        <Sessions />
      </section>
    </RequireAuth>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-6 shadow-card">
      <h2 className="mb-4 text-[20px] font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [resending, setResending] = useState(false);
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    try {
      const updated = await api<User>("/me", { method: "PATCH", version: user!.version, body: { name: text(form, "name"), phone: text(form, "phone") ?? null } });
      setUser(updated);
      toast.success("Profil disimpan");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "precondition-failed") {
        setUser(await api<User>("/me"));
        throw new UserError("Profil diubah dari perangkat lain. Data terbaru sudah dimuat, coba simpan lagi.");
      }
      throw caught;
    }
  });

  async function resend() {
    setResending(true);
    try {
      await api("/auth/email-verification", { method: "POST" });
      toast.success("Tautan verifikasi dikirim ke email Anda");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "email-already-verified") setUser({ ...user!, emailVerified: true });
      else toast.error(errorMessage(caught));
    } finally {
      setResending(false);
    }
  }

  return (
    <Card title="Data akun">
      <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
        <dt className="text-muted">Email</dt>
        <dd className="break-all font-semibold">{user!.email}</dd>
        <dt className="text-muted">Peran</dt>
        <dd className="font-semibold">{roleLabel[user!.role]}{user!.isSuperAdmin ? " (superadmin)" : ""}</dd>
        <dt className="text-muted">Status email</dt>
        <dd className={user!.emailVerified ? "font-semibold text-teal" : "font-semibold text-danger"}>
          {user!.emailVerified ? "Terverifikasi" : "Belum diverifikasi"}
        </dd>
      </dl>
      {!user!.emailVerified && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-sun/60 bg-sun/10 px-4 py-3 text-sm">
          <span>Verifikasi email dulu sebelum membeli tiket.</span>
          <Button size="sm" variant="dark" loading={resending} onClick={resend}>
            Kirim ulang tautan
          </Button>
        </div>
      )}
      {/* key: form di-reset ke data terbaru setelah simpan / konflik 412. */}
      <form key={user!.version} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field name="name" label="Nama" defaultValue={user!.name} autoComplete="name" required minLength={2} maxLength={100} error={fieldErrors.name} />
        <Field name="phone" label="Nomor HP" type="tel" defaultValue={user!.phone ?? ""} autoComplete="tel" placeholder="08…" hint="Kosongkan untuk menghapus." error={fieldErrors.phone} />
        <FormError>{error}</FormError>
        <Button type="submit" variant="dark" loading={loading} className="self-start">
          Simpan profil
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { applySession } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== form.get("passwordConfirm")) throw new UserError("Konfirmasi password tidak sama.");
    try {
      // 200 + token baru: tokenVersion naik, jadi token lama di memori ikut ditolak (kontrak §9.3).
      applySession(await api<Session>("/me/password", { method: "POST", body: { currentPassword: String(form.get("currentPassword") ?? ""), newPassword } }));
      formRef.current?.reset();
      toast.success("Password diganti. Perangkat lain sudah dikeluarkan.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "current-password-invalid") throw new UserError("Password saat ini salah.");
      throw caught;
    }
  });

  return (
    <Card title="Ganti password">
      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field name="currentPassword" label="Password saat ini" type="password" autoComplete="current-password" required error={fieldErrors.currentPassword} />
        <Field name="newPassword" label="Password baru" type="password" autoComplete="new-password" required minLength={8} maxLength={64} hint="8–64 karakter." error={fieldErrors.newPassword} />
        <Field name="passwordConfirm" label="Ulangi password baru" type="password" autoComplete="new-password" required />
        <FormError>{error}</FormError>
        <Button type="submit" variant="dark" loading={loading} className="self-start">
          Ganti password
        </Button>
      </form>
    </Card>
  );
}

function Sessions() {
  const { logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<"one" | "all" | null>(null);

  async function run(all: boolean) {
    if (all && !confirm("Keluar dari semua perangkat, termasuk perangkat ini?")) return;
    setPending(all ? "all" : "one");
    try {
      await logout({ all });
      router.replace("/login");
    } catch (caught) {
      toast.error(errorMessage(caught));
      setPending(null);
    }
  }

  return (
    <Card title="Sesi">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" loading={pending === "one"} disabled={pending !== null} onClick={() => run(false)}>
          Keluar
        </Button>
        <Button variant="text" loading={pending === "all"} disabled={pending !== null} onClick={() => run(true)} className="text-danger">
          Keluar dari semua perangkat
        </Button>
      </div>
    </Card>
  );
}
