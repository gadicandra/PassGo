"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const STAGGER_MS = 60;
const MAX_DELAY_MS = 360;

let observer: IntersectionObserver | null = null;

/** Satu observer untuk semua elemen; tiap elemen dianimasikan sekali saat ±20% terlihat. */
function observe(element: Element) {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer?.unobserve(entry.target);
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
  );
  observer.observe(element);
  return () => observer?.unobserve(element);
}

/**
 * Bungkus elemen supaya muncul naik saat masuk layar (sekali saja).
 * `index` memberi jeda bertingkat untuk elemen dalam satu baris/grid.
 */
export function Reveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return observe(ref.current);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${Math.min(index * STAGGER_MS, MAX_DELAY_MS)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
