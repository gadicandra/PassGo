import type { Metadata } from "next";
import { OrderList } from "./OrderList";

export const metadata: Metadata = { title: "Pesanan saya" };

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.01em] md:text-[56px]">Pesanan saya</h1>
      <OrderList />
    </div>
  );
}
