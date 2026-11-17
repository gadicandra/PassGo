"use client";

import { useEffect, useRef, useState } from "react";
import { api, errorMessage, type Session } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Tombol resmi Google Identity Services. Tanpa NEXT_PUBLIC_GOOGLE_CLIENT_ID tombol tidak ditampilkan.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface GoogleId {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup" }): void;
  renderButton(element: HTMLElement, options: Record<string, string | number>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let loader: Promise<void> | null = null;
function loadScript(): Promise<void> {
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Skrip Google gagal dimuat."));
    };
    document.head.appendChild(script);
  });
  return loader;
}

/** "Lanjutkan dengan Google". Sukses → sesi disimpan; halaman login/daftar yang mengarahkan ke tujuan. */
export function GoogleButton({ text = "continue_with" }: { text?: "continue_with" | "signup_with" | "signin_with" }) {
  const { applySession } = useAuth();
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        const google = window.google?.accounts.id;
        if (cancelled || !google || !slot.current) return;
        google.initialize({
          client_id: CLIENT_ID,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            setError(null);
            setBusy(true);
            try {
              applySession(await api<Session>("/auth/google", { method: "POST", body: { credential } }));
            } catch (caught) {
              setError(errorMessage(caught));
            } finally {
              setBusy(false);
            }
          },
        });
        google.renderButton(slot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text,
          logo_alignment: "center",
          locale: "id",
          width: Math.min(slot.current.offsetWidth || 360, 400),
        });
      })
      .catch(() => !cancelled && setError("Login Google tidak tersedia saat ini."));
    return () => {
      cancelled = true;
    };
  }, [applySession, text]);

  if (!CLIENT_ID) return null;
  return (
    <div className="flex flex-col gap-2" aria-busy={busy || undefined}>
      <div ref={slot} className="flex min-h-[44px] w-full justify-center" />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Garis "atau" di antara tombol Google dan form email. */
export function OrDivider() {
  if (!CLIENT_ID) return null;
  return (
    <div className="my-1 flex items-center gap-3 text-[13px] text-muted" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      atau pakai email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
