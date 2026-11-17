"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, UserError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { text, useSubmit } from "@/lib/use-submit";
import type { User } from "@/types/api";

const box = "rounded-xl border border-line bg-white p-6 shadow-card";

/** Panel kanan halaman Jadi Penyelenggara: isinya mengikuti status akun dan pengajuan (kontrak §9.15). */
export function OrganizerSignup() {
  const { status, user } = useAuth();

  if (status === "loading") return <div className={`${box} h-64`} aria-busy />;

  if (status === "guest") {
    return (
      <div className={box}>
        <h2 className="text-[20px] font-semibold">Mulai dengan akun PassGo</h2>
        <p className="mt-2 text-navy/75">Pengajuan dibuat dari akun peserta. Masuk atau daftar terlebih dahulu.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/login?next=/jadi-penyelenggara" variant="dark">Masuk</ButtonLink>
          <ButtonLink href="/register" variant="outline">Daftar</ButtonLink>
        </div>
      </div>
    );
  }

  if (user!.role === "ORGANIZER") {
    return (
      <div className={box}>
        <h2 className="text-[20px] font-semibold">Anda sudah penyelenggara</h2>
        <p className="mt-2 text-navy/75">Kelola acara, tipe tiket, dan panitia dari dashboard.</p>
        <ButtonLink href={homeFor("ORGANIZER")} variant="dark" className="mt-5">Buka dashboard</ButtonLink>
      </div>
    );
  }

  if (user!.role === "STAFF") {
    return (
      <div className={box}>
        <h2 className="text-[20px] font-semibold">Akun panitia</h2>
        <p className="mt-2 text-navy/75">Akun panitia dikelola oleh penyelenggara. Gunakan akun peserta untuk mengajukan diri sebagai penyelenggara.</p>
      </div>
    );
  }

  const request = user!.organizerRequest;
  if (request?.status === "PENDING") {
    return (
      <div className={box}>
        <p className="text-sm font-semibold text-sun">Menunggu persetujuan</p>
        <h2 className="mt-1 text-[20px] font-semibold">{request.organization}</h2>
        <p className="mt-2 text-navy/75">Diajukan {formatDateTime(request.requestedAt)}. Setelah disetujui, muat ulang halaman ini untuk membuka dashboard penyelenggara.</p>
        <p className="mt-4 whitespace-pre-line rounded-md bg-cream px-4 py-3 text-sm">{request.reason}</p>
      </div>
    );
  }

  if (!user!.emailVerified) {
    return (
      <div className={box}>
        <h2 className="text-[20px] font-semibold">Verifikasi email dulu</h2>
        <p className="mt-2 text-navy/75">Pengajuan penyelenggara memerlukan email yang sudah terverifikasi. Kirim ulang tautan verifikasi dari halaman profil.</p>
        <ButtonLink href="/profile" variant="dark" className="mt-5">Buka profil</ButtonLink>
      </div>
    );
  }

  return <RequestForm rejectedNote={request?.status === "REJECTED" ? request.note ?? "" : null} />;
}

function RequestForm({ rejectedNote }: { rejectedNote: string | null }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    try {
      const updated = await api<User>("/me/organizer-request", {
        method: "POST",
        body: { organization: text(form, "organization"), reason: text(form, "reason"), link: text(form, "link") ?? null },
      });
      setUser(updated);
      toast.success("Pengajuan terkirim");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "organizer-request-pending") throw new UserError("Pengajuan sebelumnya masih menunggu persetujuan.");
      throw caught;
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className={`${box} flex flex-col gap-4 self-start`}>
      <h2 className="text-[20px] font-semibold">Daftar sebagai penyelenggara</h2>
      {rejectedNote !== null && (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          Pengajuan sebelumnya ditolak{rejectedNote ? `: ${rejectedNote}` : "."} Anda dapat mengajukan kembali.
        </p>
      )}
      <Field name="organization" label="Nama penyelenggara atau komunitas" required minLength={2} maxLength={120} error={fieldErrors.organization} />
      <Field name="link" label="Instagram atau situs (opsional)" type="url" placeholder="https://" maxLength={200} error={fieldErrors.link} />
      <TextArea name="reason" label="Acara yang akan dibuat" required minLength={20} maxLength={500} rows={5} hint="Jenis acara, perkiraan jumlah peserta, dan tempatnya." error={fieldErrors.reason} />
      <FormError>{error}</FormError>
      <Button type="submit" loading={loading}>Kirim pengajuan</Button>
    </form>
  );
}
