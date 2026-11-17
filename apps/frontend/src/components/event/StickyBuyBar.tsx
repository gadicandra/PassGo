"use client";

import { useEffect, useState } from "react";

/**
 * Bilah "Harga mulai dari … [Pilih tiket]" khusus HP (pola Loket). Muncul saat kotak pilih tiket
 * (#pilih-tiket) tidak terlihat, menempel di atas bilah navigasi bawah, dan tombolnya menggulir kembali ke sana.
 */
export function StickyBuyBar({ priceLabel }: { priceLabel: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("pilih-tiket");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.05 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;
  const [lead, amount] = priceLabel.startsWith("Mulai ") ? ["Harga mulai dari", priceLabel.slice(6)] : ["Harga", priceLabel];

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 animate-[rise-in_250ms_var(--ease-ticket)] border-t border-line bg-white px-4 py-3 shadow-[0_-6px_20px_rgb(20_33_61/0.12)] md:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] text-muted">{lead}</p>
          <p className="truncate text-[17px] font-bold tabular-nums">{amount}</p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById("pilih-tiket")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="h-11 shrink-0 rounded-lg bg-brand px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Pilih tiket
        </button>
      </div>
    </div>
  );
}
