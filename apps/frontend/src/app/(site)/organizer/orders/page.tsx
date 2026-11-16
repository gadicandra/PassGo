import { RequireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { OrganizerOrders } from "./OrganizerOrders";

export const metadata: Metadata = { title: "Pesanan" };

export default function OrganizerOrdersPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <RequireAuth roles={["ORGANIZER"]}><OrganizerOrders /></RequireAuth>
    </div>
  );
}
