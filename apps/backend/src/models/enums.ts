export const USER_ROLES = ["ORGANIZER", "STAFF", "ATTENDEE"] as const;
export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;
export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "EXPIRED",
  "CANCELLED",
] as const;
export const REFUND_STATUSES = [
  "NOT_REQUIRED",
  "REQUIRED",
  "REFUNDED",
] as const;
export const TICKET_EMAIL_STATUSES = [
  "NOT_APPLICABLE",
  "PENDING",
  "SENT",
  "FAILED",
] as const;
export const PAYMENT_STATUSES = [
  "PENDING",
  "SETTLED",
  "CHALLENGE",
  "EXPIRED",
  "CANCELLED",
  "DENIED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export const TICKET_STATUSES = ["VALID", "CHECKED_IN", "VOID"] as const;
export const VOID_REASONS = ["EVENT_CANCELLED", "ORDER_REFUNDED"] as const;
export const CHECK_IN_METHODS = ["QR", "MANUAL"] as const;
export const CHECK_IN_RESULTS = [
  "ACCEPTED",
  "ALREADY_CHECKED_IN",
  "TICKET_VOID",
  "WRONG_EVENT",
  "NOT_FOUND",
  "CHECK_IN_CLOSED",
] as const;
export const AUTH_TOKEN_PURPOSES = [
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
] as const;
export const IDEMPOTENCY_STATES = ["IN_PROGRESS", "COMPLETED"] as const;
export const EMAIL_TYPES = [
  "EMAIL_VERIFICATION",
  "ACCOUNT_EXISTS",
  "PASSWORD_RESET",
  "ORDER_TICKETS",
  "TICKET_REISSUED",
  "EVENT_CANCELLED",
  "REFUND_REQUIRED",
  "ORDER_REFUNDED",
] as const;
export const EMAIL_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
] as const;
export const AUDIT_ACTOR_ROLES = [
  "ORGANIZER",
  "STAFF",
  "ATTENDEE",
  "SYSTEM",
] as const;
