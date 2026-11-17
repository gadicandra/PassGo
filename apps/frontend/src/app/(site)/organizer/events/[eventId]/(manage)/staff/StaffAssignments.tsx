"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useManagedEvent } from "@/components/organizer/EventManage";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { StaffAssignment, User } from "@/types/api";
import { formatDateTime } from "@/lib/format";
import { assignStaff, listActiveStaffUsers, listEventStaff, removeStaff } from "@/lib/organizer/api";
import { errorMessage } from "@/lib/organizer/errors";

export function StaffAssignments() {
  const { event } = useManagedEvent();
  const toast = useToast();
  const [assigned, setAssigned] = useState<StaffAssignment[] | null>(null);
  const [staff, setStaff] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // Penugasan hanya untuk acara terbit yang belum berakhir (kontrak §9.7): panitia tidak boleh melihat draf.
  const assignable = event.status === "PUBLISHED" && !event.isEnded;

  const fetchAll = useCallback(
    () => Promise.all([listEventStaff(event.id), assignable ? listActiveStaffUsers() : Promise.resolve([] as User[])]),
    [event.id, assignable],
  );

  const load = useCallback(() => {
    fetchAll()
      .then(([assignments, users]) => {
        setAssigned(assignments);
        setStaff(users);
      })
      .catch((caught) => setError(errorMessage(caught, "Gagal memuat panitia.")));
  }, [fetchAll]);

  useEffect(() => {
    let active = true;
    fetchAll()
      .then(([assignments, users]) => {
        if (!active) return;
        setAssigned(assignments);
        setStaff(users);
      })
      .catch((caught) => active && setError(errorMessage(caught, "Gagal memuat panitia.")));
    return () => {
      active = false;
    };
  }, [fetchAll]);

  const assignedIds = useMemo(() => new Set(assigned?.map((item) => item.user.id)), [assigned]);
  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (staff ?? []).filter(
      (user) =>
        !assignedIds.has(user.id) && (!needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)),
    );
  }, [staff, assignedIds, query]);

  async function assign(user: User) {
    setBusy(user.id);
    try {
      const assignment = await assignStaff(event.id, user.id);
      setAssigned((current) => [...(current ?? []).filter((item) => item.user.id !== user.id), assignment]);
      toast.success(`${user.name} ditugaskan.`);
    } catch (caught) {
      toast.error(errorMessage(caught, "Gagal menugaskan panitia."));
      // user-not-staff: akun baru dinonaktifkan/diubah perannya; segarkan daftar calon.
      load();
    } finally {
      setBusy(null);
    }
  }

  async function revoke(item: StaffAssignment) {
    setBusy(item.user.id);
    try {
      await removeStaff(event.id, item.user.id);
      setAssigned((current) => (current ?? []).filter((row) => row.user.id !== item.user.id));
      toast.success(`Penugasan ${item.user.name} dicabut.`);
    } catch (caught) {
      toast.error(errorMessage(caught, "Gagal mencabut penugasan."));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <section className="min-w-0 lg:col-span-7">
        <h2 className="text-[20px] font-semibold">Panitia bertugas</h2>
        <p className="mt-1 max-w-xl text-[14px] text-muted">
          Panitia bisa memindai tiket dan melihat daftar peserta acara ini. Mencabut penugasan tidak membatalkan check-in yang sudah dilakukan.
        </p>
        {!assigned ? (
          <div className="mt-6 flex flex-col gap-2" aria-busy aria-label="Memuat panitia">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : assigned.length === 0 ? (
          <p className="mt-6 border-t border-line py-8 text-muted">Belum ada panitia yang ditugaskan.</p>
        ) : (
          <ul className="mt-6 border-t border-line">
            {assigned.map((item) => (
              <li key={item.user.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.user.name}</p>
                  <p className="truncate text-[14px] text-muted">{item.user.email}</p>
                  <p className="text-[13px] text-muted">
                    Ditugaskan oleh {item.assignedBy.name}, {formatDateTime(item.assignedAt, event.timezone)}
                  </p>
                </div>
                <Button variant="text" size="sm" loading={busy === item.user.id} onClick={() => revoke(item)}>
                  Cabut
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0 lg:col-span-5">
        <h2 className="text-[20px] font-semibold">Tugaskan panitia</h2>
        {!assignable ? (
          <p className="mt-2 text-[15px] text-muted">
            {event.status === "DRAFT"
              ? "Panitia bisa ditugaskan setelah acara terbit, karena panitia tidak boleh melihat draf."
              : "Acara ini sudah berakhir atau dibatalkan, jadi penugasan tidak bisa diubah."}
          </p>
        ) : (
          <>
            <label htmlFor="staff-search" className="sr-only">
              Cari nama atau email panitia
            </label>
            <input
              id="staff-search"
              type="search"
              value={query}
              onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              placeholder="Cari nama atau email"
              className="mt-4 h-11 w-full rounded-md border border-navy/25 bg-white px-3 text-base placeholder:text-muted md:text-[15px] focus:border-navy focus:outline-none"
            />
            {!staff ? (
              <Skeleton className="mt-4 h-32 w-full" />
            ) : candidates.length === 0 ? (
              <p className="mt-4 text-[15px] text-muted">
                {staff.length === 0 || staff.every((user) => assignedIds.has(user.id))
                  ? "Semua akun panitia aktif sudah ditugaskan. "
                  : "Tidak ada panitia yang cocok. "}
                <Link href="/organizer/users" className="font-semibold text-navy underline underline-offset-4 hover:text-brand">
                  Buat akun panitia
                </Link>
              </p>
            ) : (
              <ul className="mt-4 max-h-[420px] overflow-y-auto border-t border-line">
                {candidates.map((user) => (
                  <li key={user.id} className="flex items-center justify-between gap-4 border-b border-line py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{user.name}</p>
                      <p className="truncate text-[14px] text-muted">{user.email}</p>
                    </div>
                    <Button variant="outline" size="sm" loading={busy === user.id} disabled={busy !== null && busy !== user.id} onClick={() => assign(user)}>
                      Tugaskan
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
