import type { NextConfig } from "next";

// Semua request /api/v1/* diteruskan ke backend, jadi browser melihat satu origin.
// Wajib: refresh token disimpan di cookie SameSite=Strict, yang tidak terkirim lintas domain.
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

// CSP tanpa nonce (docs Next "Without Nonces"): halaman tetap static. 'unsafe-inline' di script-src dibutuhkan
// skrip hydration Next; skrip pihak ketiga tetap dibatasi ke allowlist. Domain Snap dari docs Midtrans (CSP whitelist).
// ponytail: tanpa nonce, XSS inline belum tertutup penuh. Upgrade: nonce lewat proxy.ts (semua halaman jadi dinamis).
const isDev = process.env.NODE_ENV === "development";
const midtrans = "https://*.midtrans.com https://*.veritrans.co.id https://*.cloudfront.net https://*.mixpanel.com https://*.google-analytics.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${midtrans}`,
  "style-src 'self' 'unsafe-inline'",
  // Poster dari Supabase Storage (atau /uploads lokal lewat rewrite) dan QR data: URL.
  "img-src 'self' data: blob: https://*.supabase.co " + midtrans,
  "font-src 'self'",
  `connect-src 'self' ${midtrans}`,
  `frame-src ${midtrans}`,
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${midtrans}`,
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Header keamanan halaman FE (API sudah pakai helmet).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
