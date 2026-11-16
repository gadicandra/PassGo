import type { Metadata } from "next";
import { SalesReportView } from "./SalesReportView";

export const metadata: Metadata = { title: "Laporan penjualan" };

export default function SalesReportPage() {
  return <SalesReportView />;
}
