"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiEnvelope, api, ApiError, errorMessage, UserError } from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { text, useSubmit } from "@/lib/use-submit";
import type { Role, User } from "@/types/api";

const roleLabel: Record<Role, string> = { ORGANIZER: "Penyelenggara", STAFF: "Panitia", ATTENDEE: "Peserta" };

interface PageMeta {
  page: number;
  totalPages: number;
  totalItems: number;
}

export default function UsersPage() {
  return (
    <RequireAuth roles={["ORGANIZER"]}>
      <Users />
    </RequireAuth>
  );
}

function Users() {
  const toast = useToast();
  const [filters, setFilters] = useState({ q: "", role: "", isActive: "" });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<User[] | null>(null);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await apiEnvelope<User[], PageMeta>("/users", {
        // q minimal 2 karakter (kontrak §4.4); 1 karakter diabaikan, bukan 422.
        query: { page, pageSize: 20, q: filters.q.trim().length >= 2 ? filters.q.trim() : undefined, role: filters.role, isActive: filters.isActive },
      });
      setRows(result.data);
      setMeta(result.meta!);
    } catch (caught) {
      toast.error(errorMessage(caught));
      setRows([]);
    }
    // toast stabil secara perilaku; sengaja tidak ikut dependency agar tidak memicu fetch ulang tiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.01em] md:text-[36px]">Pengguna</h1>
        <Button onClick={() => setCreating(true)}>Tambah akun</Button>
      </div>


      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px_200px]">
        <Field name="q" label="Cari nama/email" type="search" value={filters.q} onChange={(e) => setFilter("q", e.target.value)} />
        <Select name="role" label="Peran" value={filters.role} onChange={(e) => setFilter("role", e.target.value)}>
          <option value="">Semua</option>
          {Object.entries(roleLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select name="isActive" label="Status" value={filters.isActive} onChange={(e) => setFilter("isActive", e.target.value)}>
          <option value="">Semua</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </Select>
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Nama</th>
              <th className="px-4 py-3 font-semibold">Peran</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Dibuat</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows === null &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            )}
            {rows?.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="font-semibold">{user.name}</div>
                  <div className="break-all text-sm text-muted">{user.email}</div>
                </td>
                <td className="px-4 py-3">{roleLabel[user.role]}</td>
                <td className={user.isActive ? "px-4 py-3 text-teal" : "px-4 py-3 text-danger"}>{user.isActive ? "Aktif" : "Nonaktif"}</td>
                <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditing(user)}>
                    Ubah
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted">
            Halaman {meta.page} dari {meta.totalPages} ({meta.totalItems} pengguna)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Sebelumnya
            </Button>
            <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
              Berikutnya
            </Button>
          </div>
        </nav>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} onDone={load} />}
      {editing && <EditDialog user={editing} onClose={() => setEditing(null)} onDone={load} />}
    </section>
  );
}

/** <dialog> native: fokus terkunci, Esc menutup, backdrop gratis. */
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-xl bg-white p-6 text-navy shadow-card-hover backdrop:bg-navy/50"
    >
      <h2 className="mb-4 text-[20px] font-semibold">{title}</h2>
      {children}
    </dialog>
  );
}

function CreateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  // Key dipakai ulang hanya untuk retry setelah gagal jaringan/5xx (kontrak §5). Respons 4xx disimpan server,
  // jadi setelah 4xx form yang sudah diperbaiki butuh key baru, kalau tidak → 422 idempotency-key-reused.
  const key = useRef<string>(null);
  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    key.current ??= crypto.randomUUID();
    try {
      await api<User>("/users", {
        method: "POST",
        idempotencyKey: key.current,
        body: { name: text(form, "name") ?? "", email: text(form, "email") ?? "", phone: text(form, "phone") ?? null, role: form.get("role"), password: String(form.get("password") ?? "") },
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500) key.current = null;
      throw caught;
    }
    toast.success("Akun dibuat. Sampaikan password awal ke pemiliknya.");
    onDone();
    onClose();
  });

  return (
    <Dialog title="Tambah akun panitia/penyelenggara" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field name="name" label="Nama" required error={fieldErrors.name} />
        <Field name="email" label="Email" type="email" required error={fieldErrors.email} />
        <Field name="phone" label="Nomor HP (opsional)" type="tel" error={fieldErrors.phone} />
        <Select name="role" label="Peran" defaultValue="STAFF" error={fieldErrors.role}>
          <option value="STAFF">Panitia</option>
          <option value="ORGANIZER">Penyelenggara</option>
        </Select>
        <Field name="password" label="Password awal" type="password" autoComplete="new-password" required minLength={8} maxLength={64} hint="8–64 karakter." error={fieldErrors.password} />
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="dark" loading={loading}>
            Buat akun
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const conflictMessage: Record<string, string> = {
  "last-organizer": "Harus ada minimal satu penyelenggara aktif.",
  "cannot-modify-self": "Anda tidak bisa mengubah peran atau status akun sendiri. Minta penyelenggara lain.",
  "precondition-failed": "Akun ini baru diubah orang lain. Tutup lalu buka lagi untuk memuat data terbaru.",
};

function EditDialog({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { user: me } = useAuth();
  const self = me?.id === user.id;
  // Kontrak §9.4: peran hanya STAFF ↔ ORGANIZER; peserta tidak bisa diubah perannya.
  const canChangeRole = !self && user.role !== "ATTENDEE";

  const { onSubmit, loading, error, fieldErrors } = useSubmit(async (form) => {
    const patch: Record<string, unknown> = {};
    const name = text(form, "name");
    const phone = text(form, "phone") ?? null;
    if (name !== user.name) patch.name = name;
    if (phone !== user.phone) patch.phone = phone;
    if (canChangeRole && form.get("role") !== user.role) patch.role = form.get("role");
    const isActive = form.get("isActive") === "true";
    if (!self && isActive !== user.isActive) patch.isActive = isActive;
    if (Object.keys(patch).length === 0) return onClose();
    try {
      await api<User>(`/users/${user.id}`, { method: "PATCH", version: user.version, body: patch });
      toast.success("Akun diperbarui");
      onDone();
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && conflictMessage[caught.code]) throw new UserError(conflictMessage[caught.code]);
      throw caught;
    }
  });

  return (
    <Dialog title={`Ubah ${user.name}`} onClose={onClose}>
      <p className="-mt-2 mb-4 break-all text-sm text-muted">{user.email}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field name="name" label="Nama" defaultValue={user.name} required error={fieldErrors.name} />
        <Field name="phone" label="Nomor HP" type="tel" defaultValue={user.phone ?? ""} error={fieldErrors.phone} />
        {canChangeRole && (
          <Select name="role" label="Peran" defaultValue={user.role} hint="Mengubah peran mengeluarkan akun dari semua perangkat." error={fieldErrors.role}>
            <option value="STAFF">Panitia</option>
            <option value="ORGANIZER">Penyelenggara</option>
          </Select>
        )}
        {!self && (
          <Select name="isActive" label="Status" defaultValue={String(user.isActive)} hint="Akun nonaktif langsung dikeluarkan dan tidak bisa masuk." error={fieldErrors.isActive}>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </Select>
        )}
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="dark" loading={loading}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

