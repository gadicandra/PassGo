import type { Metadata } from "next";
import { Archivo, Hanken_Grotesk, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// Archivo 800: satu judul utama per halaman. Hanken Grotesk: semua UI.
// Source Serif 4: hanya deskripsi acara. JetBrains Mono: hanya kode tiket & nomor pesanan.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PassGo", template: "%s · PassGo" },
  description: "Tiket acara komunitas kreatif: workshop, pertunjukan, dan pameran.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${archivo.variable} ${hanken.variable} ${sourceSerif.variable} ${jetbrains.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
