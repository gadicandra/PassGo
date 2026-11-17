import type { CheckIn, CheckInResult, VoidReason } from "@/types/api";
import { ApiError, api } from "@/lib/api";
import { formatTime } from "@/lib/format";

export type OutcomeKind = "success" | "warning" | "error";

export interface ScanOutcome {
  result: CheckInResult;
  kind: OutcomeKind;
  title: string;
  detail: string;
  holderName: string | null;
  ticketTypeName: string | null;
  at: Date;
}

export type CheckInTarget = { code: string } | { ticketId: string };

const voidReasonText: Record<VoidReason, string> = {
  EVENT_CANCELLED: "Acara ini dibatalkan.",
  ORDER_REFUNDED: "Pesanannya sudah di-refund.",
};

const RETRY_WINDOW_MS = 30_000;

interface AlreadyCheckedIn {
  checkedInAt: string;
  checkedInBy: { id: string; name: string } | null;
  holderName: string;
  ticketTypeName: string;
}

export async function submitCheckIn(
  eventId: string,
  target: CheckInTarget,
  context: { selfId: string; timezone: string },
): Promise<ScanOutcome> {
  const at = new Date();
  try {
    const checkIn = await api<CheckIn>(`/events/${eventId}/check-ins`, { method: "POST", body: target });
    return {
      result: "ACCEPTED",
      kind: "success",
      title: "Silakan masuk",
      detail: "Check-in tercatat.",
      holderName: checkIn.ticket?.holderName ?? null,
      ticketTypeName: checkIn.ticket?.ticketTypeName ?? null,
      at,
    };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const base = { holderName: null, ticketTypeName: null, at };
    switch (error.code) {
      case "ticket-already-checked-in": {
        const info = error.problem.checkIn as AlreadyCheckedIn | undefined;
        const when = info ? formatTime(info.checkedInAt, context.timezone) : "";
        const justNow = info && info.checkedInBy?.id === context.selfId && at.getTime() - new Date(info.checkedInAt).getTime() < RETRY_WINDOW_MS;
        if (justNow) {
          return { ...base, result: "ACCEPTED", kind: "success", title: "Silakan masuk", detail: "Baru saja di-check-in oleh kamu.", holderName: info.holderName, ticketTypeName: info.ticketTypeName };
        }
        return {
          ...base,
          result: "ALREADY_CHECKED_IN",
          kind: "warning",
          title: "Tiket sudah dipakai",
          detail: info ? `Masuk pukul ${when}${info.checkedInBy ? ` oleh ${info.checkedInBy.name}` : ""}.` : "Tiket ini sudah dipakai untuk masuk.",
          holderName: info?.holderName ?? null,
          ticketTypeName: info?.ticketTypeName ?? null,
        };
      }
      case "ticket-void": {
        const reason = error.problem.voidReason as VoidReason | null | undefined;
        return { ...base, result: "TICKET_VOID", kind: "error", title: "Tiket tidak berlaku", detail: (reason && voidReasonText[reason]) || "Tiket ini sudah dibatalkan." };
      }
      case "ticket-wrong-event":
        return { ...base, result: "WRONG_EVENT", kind: "error", title: "Tiket acara lain", detail: "Kode ini bukan untuk acara ini." };
      case "ticket-not-found":
        return { ...base, result: "NOT_FOUND", kind: "error", title: "Kode tidak dikenal", detail: "Periksa kembali kodenya atau pindai ulang." };
      case "check-in-closed": {
        const opensAt = error.problem.checkInOpensAt as string | undefined;
        const early = opensAt ? new Date(opensAt).getTime() > at.getTime() : false;
        return {
          ...base,
          result: "CHECK_IN_CLOSED",
          kind: "warning",
          title: early ? "Check-in belum dibuka" : "Check-in sudah ditutup",
          detail: early && opensAt ? `Dibuka pukul ${formatTime(opensAt, context.timezone)}.` : "Acara ini sudah selesai.",
        };
      }
      default:
        throw error;
    }
  }
}

export function unknownCodeOutcome(): ScanOutcome {
  return { result: "NOT_FOUND", kind: "error", title: "Kode tidak dikenal", detail: "Ini bukan QR tiket PassGo.", holderName: null, ticketTypeName: null, at: new Date() };
}

export const resultLabel: Record<CheckInResult, string> = {
  ACCEPTED: "Diterima",
  ALREADY_CHECKED_IN: "Sudah dipakai",
  TICKET_VOID: "Tidak berlaku",
  WRONG_EVENT: "Acara lain",
  NOT_FOUND: "Tidak dikenal",
  CHECK_IN_CLOSED: "Di luar jam check-in",
};
