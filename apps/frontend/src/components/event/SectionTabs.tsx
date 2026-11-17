"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Tab lengket ala Loket (Deskripsi · Tiket · Lokasi): tautan ke bagian halaman, yang terlihat ditandai. */
export function SectionTabs({ tabs }: { tabs: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    // Bagian dianggap aktif saat melewati pita tipis di bawah header + tab (bukan sekadar terlihat sedikit).
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    for (const tab of tabs) {
      const element = document.getElementById(tab.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <nav aria-label="Bagian halaman" className="sticky top-16 z-30 -mx-4 border-b border-line bg-cream/95 px-4 backdrop-blur md:top-20 md:-mx-8 md:px-8">
      <ul className="flex gap-6 relative overflow-x-auto">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <a
              href={`#${tab.id}`}
              aria-current={active === tab.id ? "location" : undefined}
              className={cn(
                "block border-b-[3px] py-3.5 text-[15px] font-semibold transition-colors",
                active === tab.id ? "border-brand text-navy" : "border-transparent text-muted hover:text-navy",
              )}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
