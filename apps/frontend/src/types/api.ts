// Tipe data mengikuti docs/api-contract.md §8 (Skema Bersama) dan §11 (Enum).
// Kalau kontrak berubah, ubah di sini dulu supaya semua halaman ikut ketahuan error-nya.

export type Role = "ORGANIZER" | "STAFF" | "ATTENDEE";
export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export type SalesStatus = "UPCOMING" | "ON_SALE" | "SOLD_OUT" | "PAUSED" | "ENDED";
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";
export type RefundStatus = "NOT_REQUIRED" | "REQUIRED" | "REFUNDED";
export type TicketEmailStatus = "NOT_APPLICABLE" | "PENDING" | "SENT" | "FAILED";
export type TicketStatus = "VALID" | "CHECKED_IN" | "VOID";
export type VoidReason = "EVENT_CANCELLED" | "ORDER_REFUNDED";
export type CheckInMethod = "QR" | "MANUAL";
export type CheckInResult =
  | "ACCEPTED"
  | "ALREADY_CHECKED_IN"
  | "TICKET_VOID"
  | "WRONG_EVENT"
  | "NOT_FOUND"
  | "CHECK_IN_CLOSED";

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventStats {
  ticketsSold: number;
  ticketsReserved: number;
  totalQuota: number;
  checkedIn: number;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  venueName: string;
  posterUrl: string | null;
  status: EventStatus;
  isEnded: boolean;
  priceFrom: number | null;
  salesStatus: SalesStatus;
  stats: EventStats | null;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: number;
  quota: number;
  available: number;
  salesStartAt: string;
  salesEndAt: string;
  maxPerOrder: number;
  salesStatus: SalesStatus;
  isActive: boolean;
  sortOrder: number;
  soldCount: number | null;
  reservedCount: number | null;
  version: number | null;
}

export interface Event extends EventSummary {
  description: string;
  venueAddress: string;
  mapsUrl: string | null;
  checkInOpensAt: string;
  checkInOpensAtIsDefault: boolean | null;
  capacity: number | null;
  maxTicketsPerUser: number | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  ticketTypes: TicketType[];
  createdBy: UserRef | null;
  version: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StaffAssignment {
  eventId: string;
  user: UserRef;
  assignedBy: UserRef;
  assignedAt: string;
}

export interface OrderItem {
  ticketTypeId: string;
  ticketTypeName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderPayment {
  provider: "MIDTRANS";
  status: string;
  paymentType: string | null;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  settledAt: string | null;
  lastSyncedAt: string | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  status: OrderStatus;
  total: number;
  ticketCount: number;
  refundStatus: RefundStatus;
  buyer: UserRef;
  expiresAt: string | null;
  createdAt: string;
}

export interface TicketSummary {
  id: string;
  codeMasked: string;
  holderName: string;
  ticketTypeId: string;
  ticketTypeName: string;
  status: TicketStatus;
  checkedInAt: string | null;
}

export interface Order extends OrderSummary {
  items: OrderItem[];
  subtotal: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  payment: OrderPayment | null;
  paidAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
  refundNote: string | null;
  refundedBy: UserRef | null;
  ticketEmailStatus: TicketEmailStatus;
  tickets: TicketSummary[];
  updatedAt: string;
}

export interface Ticket extends TicketSummary {
  code: string | null;
  qrPayload: string | null;
  orderId: string;
  orderNumber: string;
  event: EventSummary;
  holderNameEditable: boolean;
  voidedAt: string | null;
  voidReason: VoidReason | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendee {
  ticketId: string;
  codeMasked: string;
  holderName: string;
  ticketTypeId: string;
  ticketTypeName: string;
  status: TicketStatus;
  checkedInAt: string | null;
  checkedInBy: UserRef | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  orderId: string | null;
  orderNumber: string | null;
  codeVersion: number | null;
  version: number | null;
}

export interface CheckIn {
  id: string;
  eventId: string;
  result: CheckInResult;
  method: CheckInMethod;
  /** null bila result NOT_FOUND / WRONG_EVENT. */
  ticket: TicketSummary | null;
  /** 4 karakter terakhir kode yang dipindai, hanya untuk NOT_FOUND / WRONG_EVENT. */
  scannedCodeMasked: string | null;
  scannedBy: UserRef;
  revertedAt: string | null;
  revertedBy: UserRef | null;
  revertReason: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actor: UserRef | null;
  actorRole: Role | "SYSTEM";
  action: string;
  entityType: string;
  entityId: string;
  eventId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** Bentuk error dari backend (RFC 9457 Problem Details), lihat api-contract.md §3. */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  code: string;
  /** Pesan untuk manusia (Bahasa Indonesia). Tampilkan, jangan di-parse. Pakai `code` untuk logika. */
  detail?: string;
  requestId?: string;
  errors?: Array<{ pointer?: string; detail: string; [key: string]: unknown }>;
  [extension: string]: unknown;
}
