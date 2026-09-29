import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { Ticket, TicketType } from "../models";
import type { OrderItemRecord, OrderRecord } from "./order-repository";

function ticketCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
}

export async function issueTicketsForOrder(order: OrderRecord, session: ClientSession): Promise<void> {
  for (const item of order.items) {
    await TicketType.updateOne(
      { id: item.ticketTypeId },
      { $inc: { reservedCount: -item.quantity, soldCount: item.quantity } },
      { session },
    );
    const tickets = Array.from({ length: item.quantity }, () => ({
      id: randomUUID(),
      code: ticketCode(),
      orderId: order.id,
      eventId: order.eventId,
      ticketTypeId: item.ticketTypeId,
      ownerId: order.userId,
      holderName: order.buyerName,
      status: "VALID",
      checkedInAt: null,
      checkedInBy: null,
      codeVersion: 1,
      version: 0,
    }));
    await Ticket.create(tickets, { session, ordered: true });
  }
}

export function ticketCount(items: OrderItemRecord[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}