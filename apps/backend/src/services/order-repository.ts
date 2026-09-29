import mongoose, { Schema, type ClientSession, type Model } from "mongoose";

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";

export interface EventRecord {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  startAt: Date;
  endAt: Date;
  capacity: number | null;
  maxTicketsPerUser: number | null;
}

export interface TicketTypeRecord {
  id: string;
  eventId: string;
  name: string;
  price: number;
  quota: number;
  soldCount: number;
  reservedCount: number;
  salesStartAt: Date;
  salesEndAt: Date;
  maxPerOrder: number;
  isActive: boolean;
}

export interface OrderItemRecord {
  ticketTypeId: string;
  ticketTypeName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  items: OrderItemRecord[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  expiredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventRecord>({}, { strict: false, versionKey: false });
const ticketTypeSchema = new Schema<TicketTypeRecord>({}, { strict: false, versionKey: false });
const orderSchema = new Schema<OrderRecord>({}, { strict: false, versionKey: false });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ eventId: 1, status: 1 });
orderSchema.index({ userId: 1, eventId: 1, status: 1 });
ticketTypeSchema.index({ eventId: 1, id: 1 }, { unique: true });

function model<T>(name: string, schema: Schema<T>, collection: string): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection);
}

export const EventModel = model("Event", eventSchema, "events");
export const TicketTypeModel = model("TicketType", ticketTypeSchema, "ticketTypes");
export const OrderModel = model("Order", orderSchema, "orders");

export async function reserveTicketType(
  ticketTypeId: string,
  eventId: string,
  quantity: number,
  at: Date,
  session: ClientSession,
): Promise<TicketTypeRecord | null> {
  return TicketTypeModel.findOneAndUpdate(
    {
      id: ticketTypeId,
      eventId,
      isActive: true,
      salesStartAt: { $lte: at },
      salesEndAt: { $gt: at },
      $expr: {
        $and: [
          { $lte: [quantity, "$maxPerOrder"] },
          { $lte: [{ $add: ["$soldCount", "$reservedCount", quantity] }, "$quota"] },
        ],
      },
    },
    { $inc: { reservedCount: quantity } },
    { new: true, session },
  ).lean<TicketTypeRecord>();
}

export async function releaseReservation(item: OrderItemRecord, session: ClientSession): Promise<void> {
  await TicketTypeModel.updateOne({ id: item.ticketTypeId }, { $inc: { reservedCount: -item.quantity } }, { session });
}