import type { Metadata } from "next";
import { StaffEvents } from "./StaffEvents";

export const metadata: Metadata = { title: "Acara saya" };

export default function StaffPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.01em] md:text-[40px]">Acara saya</h1>
      <StaffEvents />
    </div>
  );
}
