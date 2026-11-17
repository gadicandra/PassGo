import type { Metadata } from "next";
import { Archivo, JetBrains_Mono, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Archivo 800: hanya artwork merek (hero, poster, logo). Plus Jakarta Sans: semua UI dan judul.
// Source Serif 4: hanya deskripsi acara. JetBrains Mono: hanya kode tiket & nomor pesanan.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PassGo", template: "%s | PassGo" },
  description: "Tiket acara komunitas kreatif: workshop, pertunjukan, dan pameran.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${archivo.variable} ${jakarta.variable} ${sourceSerif.variable} ${jetbrains.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
