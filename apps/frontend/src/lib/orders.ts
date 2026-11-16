// Baris daftar pesanan untuk peserta & organizer.
// GET /orders backend saat ini belum mengikuti kontrak (tanpa filter/cursor, dokumen mentah tanpa judul acara),
// jadi judul acara digabung dari daftar acara dan filter dilakukan di sini.

import type { EventSummary, OrderRecord, OrderStatus, RefundStatus } from "@/types/api";
import { api } from "./api";

export interface OrderRow {
  id: string;
  orderNumber: string;
  eventId: string;
  eventTitle: string;
  eventStartAt: string | null;
  status: OrderStatus;
  refundStatus: RefundStatus;
  total: number;
  ticketCount: number;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
}

export async function loadOrderRows(): Promise<OrderRow[]> {
  const [orders, events] = await Promise.all([
    api<OrderRecord[]>("/orders"),
    api<EventSummary[]>("/events?when=all&pageSize=100&sort=-startAt").catch(() => [] as EventSummary[]),
  ]);
  const byId = new Map(events.map((event) => [event.id, event]));
  return orders.map((order) => {
    const event = byId.get(order.eventId);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      eventId: order.eventId,
      eventTitle: event?.title ?? "Acara",
      eventStartAt: event?.startAt ?? null,
      status: order.status,
      refundStatus: order.refundStatus,
      total: order.total,
      ticketCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      createdAt: order.createdAt,
    };
  });
}
