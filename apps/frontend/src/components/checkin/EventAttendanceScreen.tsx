"use client";

import Link from "next/link";
import { AccessDenied, GateSkeleton } from "@/components/ticket/AccessDenied";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { eventLinks } from "@/lib/tickets/links";
import { useRoleGate } from "@/lib/tickets/useRoleGate";
import { AttendanceReport } from "./AttendanceReport";
import { EventHeader, useEvent } from "./EventHeader";

const ROLES = ["STAFF", "ORGANIZER"] as const;

export function EventAttendanceScreen({ eventId }: { eventId: string }) {
  const gate = useRoleGate(ROLES);
  const { user } = useAuth();
  const { event, error } = useEvent(eventId, gate === "allowed");

  if (gate === "checking") return <GateSkeleton />;
  if (gate === "denied") return <AccessDenied message="Halaman ini untuk panitia dan penyelenggara." />;

  const links = eventLinks(user?.role, eventId);
  const back = user?.role === "ORGANIZER" ? { href: "/organizer/events", label: "Semua acara" } : { href: "/staff", label: "Acara saya" };

  return (
    <>
      <Link href={back.href} className="text-[15px] font-semibold text-muted hover:text-navy">
        {back.label}
      </Link>
      <div className="mt-3">
        <EventHeader event={event} error={error} title="Kehadiran" />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {event?.status === "CANCELLED" ? (
          <p className="font-semibold text-danger">Acara ini dibatalkan, check-in ditutup.</p>
        ) : (
          <ButtonLink href={links.scan}>Pindai tiket</ButtonLink>
        )}
        <ButtonLink href={links.attendees} variant="outline">
          Daftar peserta
        </ButtonLink>
      </div>
      <div className="mt-10">
        <AttendanceReport eventId={eventId} timezone={event?.timezone ?? "Asia/Jakarta"} />
      </div>
    </>
  );
}
