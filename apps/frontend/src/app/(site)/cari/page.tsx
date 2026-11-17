import type { Metadata } from "next";
import { SearchBox } from "@/components/layout/SearchBox";

export const metadata: Metadata = { title: "Cari acara" };

// Halaman cari untuk HP (kolom cari di header hanya tampil mulai md). Dibuka dari tab "Cari" di bilah bawah.
export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-6">
      <h1 className="mb-4 text-[24px] font-bold">Cari acara</h1>
      <SearchBox page />
    </div>
  );
}
