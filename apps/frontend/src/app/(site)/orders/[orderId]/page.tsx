import { RequireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { OrderDetail } from "./OrderDetail";

export const metadata: Metadata = { title: "Detail pesanan" };

export default async function OrderPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <RequireAuth><OrderDetail orderId={orderId} /></RequireAuth>
    </div>
  );
}
