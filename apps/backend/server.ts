// Entrypoint Vercel (zero-config Express): Vercel mencari `server.ts` di root project sebelum `src/app.ts`/`src/index.ts`,
// jadi file ini yang dipakai sebagai fungsi. `src/index.ts` tetap untuk `npm run dev`/`start` (proses long-running).
import express from "express";
import app from "./src/app";
import { connectDatabase } from "./src/lib/database";
import { initModels } from "./src/models";

// Satu koneksi per instance fungsi, dibuat saat request pertama (bukan saat import) dan dipakai ulang antar invocation.
// Gagal → promise dibuang agar request berikutnya mencoba lagi, bukan terus menerima rejection yang sama.
let ready: Promise<void> | null = null;
const ensureDatabase = () => (ready ??= connectDatabase().then(initModels).catch((error: unknown) => { ready = null; throw error; }));

// Di belakang proxy Vercel: IP klien dari X-Forwarded-For (dibutuhkan rate limit & audit log, kontrak §7).
app.set("trust proxy", 1);

const server = express();
server.disable("x-powered-by");
server.use(async (request, response, next) => {
  // Health liveness tidak butuh DB; readiness sengaja ikut connect agar mencerminkan kondisi sebenarnya.
  if (request.path === "/api/v1/health") return next();
  try { await ensureDatabase(); next(); } catch (error) {
    console.error("Database connection failed", error);
    response.status(503).type("application/problem+json").json({ type: `${process.env.PROBLEM_TYPE_BASE ?? "about:blank"}#service-unavailable`, title: "Service unavailable", status: 503, detail: "Database tidak tersedia.", code: "service-unavailable" });
  }
});
server.use(app);

export default server;
