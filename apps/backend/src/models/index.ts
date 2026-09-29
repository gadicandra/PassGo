import mongoose from "mongoose";

export * from "./enums";
export * from "./auth.models";
export * from "./event.models";
export * from "./order.models";
export * from "./ticket.models";
export * from "./system.models";

// Memastikan semua koleksi dan index selesai dibuat. Dipanggil setelah connect.
export async function initModels(): Promise<void> {
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
