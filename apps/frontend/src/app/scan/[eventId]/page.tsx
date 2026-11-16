import type { Metadata } from "next";
import { ScannerScreen } from "@/components/checkin/ScannerScreen";

export const metadata: Metadata = { title: "Pindai tiket" };

export default async function ScanPage({ params }: PageProps<"/scan/[eventId]">) {
  const { eventId } = await params;
  return <ScannerScreen eventId={eventId} />;
}
