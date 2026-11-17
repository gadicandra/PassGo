import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

// Warna & font sama dengan aplikasi (apps/frontend/src/app/globals.css).
export const color = {
  navy: "#14213d",
  navySoft: "#1c2e54",
  brand: "#f04e23",
  sun: "#f5a623",
  teal: "#1b6b63",
  cream: "#fff8f0",
  muted: "#9aa3b5",
};

export const font = {
  display: loadArchivo("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily,
  sans: loadJakarta("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily,
};

export const FPS = 30;
export const sec = (seconds: number) => Math.round(seconds * FPS);
