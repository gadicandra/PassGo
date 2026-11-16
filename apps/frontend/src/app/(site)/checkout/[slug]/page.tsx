import { RequireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/public-api";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

/** "id:2,id:1" → { id: 2 }. Jumlah tidak valid dibuang; validasi akhir tetap di server. */
function parseItems(raw: string | string[] | undefined): Record<string, number> {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const items: Record<string, number> = {};
  for (const part of (value ?? "").split(",")) {
    const [id, quantity] = part.split(":");
    const count = Number(quantity);
    if (id && Number.isInteger(count) && count > 0) items[id] = count;
  }
  return items;
}

export default async function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <RequireAuth><CheckoutForm event={event} initialItems={parseItems(query.items)} /></RequireAuth>
    </div>
  );
}
