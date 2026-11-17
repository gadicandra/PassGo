"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { toggleSaved, useSavedEvents, type SavedEvent } from "@/lib/saved";

/**
 * Tombol ♡ simpan acara. `overlay`: lingkaran kecil di pojok kartu; `labeled`: tombol berlabel di halaman detail.
 * Hati "meletup" sekali saat disimpan.
 */
export function SaveButton({ event, variant = "overlay", className }: { event: SavedEvent; variant?: "overlay" | "labeled"; className?: string }) {
  const saved = useSavedEvents().some((item) => item.id === event.id);
  const [pop, setPop] = useState(0);

  function onClick(clickEvent: React.MouseEvent) {
    // Tombol ini menumpang di atas kartu yang berupa tautan: jangan ikut membuka halaman acara.
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    if (toggleSaved(event)) setPop((count) => count + 1);
  }

  const icon = (
    <Heart
      key={pop}
      aria-hidden
      className={cn(
        variant === "overlay" ? "size-[18px]" : "size-4",
        saved ? "fill-brand text-brand" : "text-navy",
        pop > 0 && saved && "motion-safe:animate-[heart-pop_450ms_var(--ease-ticket)]",
      )}
      strokeWidth={2.25}
    />
  );

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors",
          saved ? "border-brand bg-brand/10 text-brand" : "border-navy/15 bg-white text-navy hover:border-navy/30",
          className,
        )}
      >
        {icon}
        {saved ? "Disimpan" : "Simpan acara"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Hapus ${event.title} dari simpanan` : `Simpan ${event.title}`}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white/95 shadow-card transition-transform hover:scale-110 active:scale-95",
        className,
      )}
    >
      {icon}
    </button>
  );
}
