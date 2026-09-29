import mongoose from "mongoose";
import { Payment } from "../models";
import { OrderModel, releaseReservation, type OrderRecord } from "./order-repository";

// PENDING_PAYMENT lewat expiresAt → EXPIRED, reservasi dilepas, Payment → EXPIRED. Kondisional pada status,
// jadi aman berjalan paralel dengan webhook settlement (yang kalah menjadi late settlement, §7.2).
export async function expireOrder(order: Pick<OrderRecord, "id" | "items">, at = new Date()): Promise<boolean> {
  const session = await mongoose.startSession();
  let expired = false;
  try {
    await session.withTransaction(async () => {
      expired = false;
      const moved = await OrderModel.updateOne(
        { id: order.id, status: "PENDING_PAYMENT", expiresAt: { $lte: at } },
        { $set: { status: "EXPIRED", expiredAt: at, expiresAt: null, updatedAt: at } },
        { session },
      );
      if (moved.modifiedCount !== 1) return;
      for (const item of order.items) await releaseReservation(item, session);
      await Payment.updateOne({ orderId: order.id, status: "PENDING" }, { $set: { status: "EXPIRED" } }, { session });
      expired = true;
    });
  } finally { await session.endSession(); }
  return expired;
}

export async function expireDueOrders(filter: Record<string, unknown> = {}, limit = 100): Promise<{ scanned: number; expired: number }> {
  const at = new Date();
  const due = await OrderModel.find({ ...filter, status: "PENDING_PAYMENT", expiresAt: { $lte: at } }, { id: 1, items: 1 }).sort({ expiresAt: 1 }).limit(limit).lean<Array<Pick<OrderRecord, "id" | "items">>>();
  let expired = 0;
  for (const order of due) if (await expireOrder(order, at)) expired += 1;
  return { scanned: due.length, expired };
}
