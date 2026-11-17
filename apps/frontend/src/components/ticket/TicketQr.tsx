"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function TicketQr({ payload, dimmed = false, className }: { payload: string; dimmed?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    QRCode.toCanvas(canvas.current, payload, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 320,
      color: { dark: "#14213d", light: "#ffffff" },
    }).catch(() => setFailed(true));
  }, [payload]);

  if (failed) return <p className="text-danger">QR gagal dibuat. Pakai kode di bawahnya.</p>;

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label="Kode QR tiket"
      className={cn("aspect-square w-full max-w-[320px] rounded-md border border-line bg-white transition-opacity", dimmed && "opacity-25", className)}
    />
  );
}
