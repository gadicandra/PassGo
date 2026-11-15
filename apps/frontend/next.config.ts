import type { NextConfig } from "next";

// Semua request /api/v1/* diteruskan ke backend, jadi browser melihat satu origin.
// Wajib: refresh token disimpan di cookie SameSite=Strict, yang tidak terkirim lintas domain.
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Header keamanan dasar halaman FE (API sudah pakai helmet). CSP belum: butuh nonce untuk Midtrans Snap.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
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
