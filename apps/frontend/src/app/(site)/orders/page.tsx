import { RequireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { OrderList } from "./OrderList";

export const metadata: Metadata = { title: "Pesanan saya" };

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Pesanan saya</h1>
      <RequireAuth><OrderList /></RequireAuth>
    </div>
  );
}
