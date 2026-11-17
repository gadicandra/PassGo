"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type CameraState = "starting" | "live" | "denied" | "unavailable";

const SCAN_INTERVAL_MS = 120;
const MAX_WIDTH = 640;

const stateMessage: Record<Exclude<CameraState, "live">, string> = {
  starting: "Membuka kamera…",
  denied: "Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau ketik kode tiket secara manual.",
  unavailable: "Kamera tidak tersedia di perangkat atau alamat ini (butuh HTTPS). Ketik kode tiket secara manual.",
};

export function QrCamera({ onDecode, paused, className }: { onDecode: (text: string) => void; paused: boolean; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const handler = useRef(onDecode);
  const pausedRef = useRef(paused);
  const [state, setState] = useState<CameraState>("starting");

  useEffect(() => {
    handler.current = onDecode;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    let last = 0;

    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      : Promise.reject(new DOMException("Kamera tidak didukung", "NotSupportedError"));

    request
      .then((media) => {
        const element = video.current;
        if (cancelled || !element) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        element.srcObject = media;
        element.play().catch(() => undefined);
        setState("live");

        const tick = (time: number) => {
          frame = requestAnimationFrame(tick);
          const surface = canvas.current;
          if (pausedRef.current || time - last < SCAN_INTERVAL_MS || element.readyState < 2 || !surface || !element.videoWidth) return;
          last = time;
          const scale = Math.min(1, MAX_WIDTH / element.videoWidth);
          surface.width = Math.round(element.videoWidth * scale);
          surface.height = Math.round(element.videoHeight * scale);
          const context = surface.getContext("2d", { willReadFrequently: true });
          if (!context) return;
          context.drawImage(element, 0, 0, surface.width, surface.height);
          const image = context.getImageData(0, 0, surface.width, surface.height);
          const hit = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (hit?.data) handler.current(hit.data);
        };
        frame = requestAnimationFrame(tick);
      })
      .catch((error: DOMException) => {
        if (!cancelled) setState(error?.name === "NotAllowedError" ? "denied" : "unavailable");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-card border-2 border-cream/20 bg-black", state === "live" ? "aspect-square" : "aspect-[4/3]", className)}>
      <video ref={video} playsInline muted className={cn("size-full object-cover", state !== "live" && "invisible")} aria-label="Pratinjau kamera" />
      <canvas ref={canvas} className="hidden" aria-hidden />
      {state === "live" ? (
        <div aria-hidden className={cn("pointer-events-none absolute inset-[14%] rounded-lg border-2 transition-colors", paused ? "border-cream/40" : "border-sun")} />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-cream/80" role="status">
          {stateMessage[state]}
        </p>
      )}
    </div>
  );
}
