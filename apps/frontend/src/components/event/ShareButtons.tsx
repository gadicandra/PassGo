"use client";

import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

const noop = () => () => {};

const circle = "flex size-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5";

/** "Bagikan acara": salin tautan, WhatsApp, X, Facebook, dan lembar bagikan bawaan HP bila tersedia. */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  // Dukungan navigator.share hanya diketahui di browser; server selalu false supaya hidrasi cocok.
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const pageUrl = () => window.location.origin + window.location.pathname;
  // Tautan bagikan dibangun saat diklik (butuh origin, hanya ada di browser).
  const open = (build: (text: string, link: string) => string) =>
    window.open(build(encodeURIComponent(`${title} di PassGo`), encodeURIComponent(pageUrl())), "_blank", "noopener,noreferrer");

  return (
    <section aria-label="Bagikan acara" className="mt-6">
      <h2 className="text-[15px] font-semibold">Bagikan acara</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(pageUrl()).then(() => setCopied(true), () => undefined)}
          className={cn(circle, "border border-line bg-white text-navy")}
          aria-label={copied ? "Tautan tersalin" : "Salin tautan"}
          title={copied ? "Tersalin" : "Salin tautan"}
        >
          {copied ? <Check aria-hidden className="size-[18px] text-teal" strokeWidth={2.5} /> : <Link2 aria-hidden className="size-[18px]" />}
        </button>
        <button type="button" onClick={() => open((text, link) => `https://wa.me/?text=${text}%20${link}`)} aria-label="Bagikan ke WhatsApp" className={cn(circle, "bg-[#25d366] text-white")}>
          <MessageCircle aria-hidden className="size-[18px]" strokeWidth={2.5} />
        </button>
        <button type="button" onClick={() => open((text, link) => `https://twitter.com/intent/tweet?text=${text}&url=${link}`)} aria-label="Bagikan ke X" className={cn(circle, "bg-black text-[17px] font-bold text-white")}>
          <span aria-hidden>𝕏</span>
        </button>
        <button type="button" onClick={() => open((_, link) => `https://www.facebook.com/sharer/sharer.php?u=${link}`)} aria-label="Bagikan ke Facebook" className={cn(circle, "bg-[#1877f2] text-[19px] font-extrabold text-white")}>
          <span aria-hidden>f</span>
        </button>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title, url: pageUrl() }).catch(() => undefined)}
            className={cn(circle, "bg-navy text-cream")}
            aria-label="Bagikan lewat aplikasi lain"
          >
            <Share2 aria-hidden className="size-[18px]" />
          </button>
        )}
        {copied && (
          <span role="status" className="text-[13px] font-medium text-teal">
            Tautan tersalin
          </span>
        )}
      </div>
    </section>
  );
}
