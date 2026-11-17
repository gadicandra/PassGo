import type { Metadata } from "next";
import { SavedEvents } from "./SavedEvents";

export const metadata: Metadata = { title: "Acara disimpan" };

export default function SavedPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
      <SavedEvents />
    </div>
  );
}
