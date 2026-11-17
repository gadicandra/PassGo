"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { User } from "@/types/api";

export default function OrganizerRequestsPage() {
  return (
    <RequireAuth roles={["ORGANIZER"]}>
      <Gate />
    </RequireAuth>
  );
}

/** Halaman superadmin: meninjau pengajuan peserta yang ingin menjadi penyelenggara (kontrak §9.15). */
function Gate() {
  const { user } = useAuth();
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-12 md:px-8">
      <div>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.01em] md:text-[36px]">Permintaan penyelenggara</h1>
        <p className="mt-2 max-w-2xl text-navy/75">
          Peserta yang ingin menjual tiket mengajukan diri dari halaman Jadi Penyelenggara. Setelah disetujui, akunnya menjadi penyelenggara dan bisa langsung membuat acara.
        </p>
      </div>
      {user?.isSuperAdmin ? (
        <OrganizerRequests />
      ) : (
        <div className="rounded-xl border border-line bg-white px-5 py-10 text-center text-muted shadow-card">Halaman ini hanya untuk superadmin.</div>
      )}
    </section>
  );
}

/** Pengajuan peserta untuk menjadi penyelenggara (kontrak §9.15). Disembunyikan bila tidak ada yang menunggu. */
export function OrganizerRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState<User[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setRequests(await api<User[]>("/users/organizer-requests"));
    } catch (caught) {
      toast.error(errorMessage(caught));
      setRequests([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function decide(user: User, decision: "approve" | "reject") {
    setBusy(user.id + decision);
    try {
      await api(`/users/${user.id}/organizer-request/${decision}`, { method: "POST", body: { note: notes[user.id]?.trim() || null } });
      toast.success(decision === "approve" ? `${user.name} sekarang penyelenggara` : "Pengajuan ditolak");
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught));
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (requests === null) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white px-5 py-10 text-center text-muted shadow-card">
        Belum ada pengajuan yang menunggu. Pengajuan baru masuk dari halaman Jadi Penyelenggara.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-5 py-4 text-[18px] font-semibold">
        Menunggu keputusan <span className="ml-1 rounded-full bg-sun/20 px-2 py-0.5 text-sm">{requests.length}</span>
      </h2>
      <ul className="divide-y divide-line">
        {requests.map((user) => {
          const request = user.organizerRequest!;
          return (
            <li key={user.id} className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_320px]">
              <div className="min-w-0">
                <p className="font-semibold">{request.organization}</p>
                <p className="break-all text-sm text-muted">
                  {user.name}, {user.email}
                </p>
                {request.link && (
                  <a href={request.link} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    {request.link}
                  </a>
                )}
                <p className="mt-2 whitespace-pre-line text-[15px]">{request.reason}</p>
                <p className="mt-1 text-sm text-muted">Diajukan {formatDate(request.requestedAt)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Field name={`note-${user.id}`} label="Catatan untuk pemohon (opsional)" maxLength={300} value={notes[user.id] ?? ""} onChange={(e) => setNotes((current) => ({ ...current, [user.id]: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" loading={busy === user.id + "approve"} disabled={busy !== null} onClick={() => decide(user, "approve")}>Setujui</Button>
                  <Button size="sm" variant="outline" loading={busy === user.id + "reject"} disabled={busy !== null} onClick={() => decide(user, "reject")}>Tolak</Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
