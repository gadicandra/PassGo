"use client";

import { useEffect, useState } from "react";

// Contoh kata kunci yang bergantian di placeholder, memberi ide apa yang bisa dicari.
const IDEAS = ["konser", "workshop", "pameran", "pemutaran film", "acara gratis"];
const CYCLE_MS = 2600;

/** Kolom cari di header. Placeholder bergantian, berhenti saat fokus/terisi atau reduced motion. */
export function SearchBox() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const idle = !value && !focused;

  useEffect(() => {
    if (!idle || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % IDEAS.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [idle]);

  return (
    <form action="/" role="search" className="relative hidden max-w-xl flex-1 md:block">
      <label htmlFor="site-search" className="sr-only">
        Cari acara
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? "Judul acara atau tempat" : ""}
        className="h-11 w-full rounded-lg border border-[#2b3c63] bg-[#1b2b4d] px-4 text-[15px] text-cream placeholder:text-cream/50 focus:border-brand focus:outline-none"
      />
      {idle && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center gap-1.5 overflow-hidden text-[15px] text-cream/50">
          Cari acara
          <b key={index} className="animate-[rise-in_400ms_var(--ease-ticket)] font-semibold text-cream/85">
            {IDEAS[index]}
          </b>
        </span>
      )}
    </form>
  );
}
