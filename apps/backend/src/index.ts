import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./lib/database";
import { initModels } from "./models";
import { processEmailOutbox } from "./services/email-service";
import { expireDueOrders } from "./services/order-expiry-service";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  await connectDatabase();
  await initModels();

  const server = app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });

  // Proses long-running (Azure App Service, lokal) menjalankan job sendiri; Vercel tetap lewat Vercel Cron.
  // Aman di banyak instance: outbox di-claim atomik, expiry kondisional pada status. 0 = mati.
  const jobEveryMs = Number(process.env.JOB_INTERVAL_SECONDS ?? 60) * 1000;
  const timer = jobEveryMs > 0
    ? setInterval(() => {
        Promise.all([expireDueOrders(), processEmailOutbox(Number(process.env.EMAIL_BATCH_SIZE ?? 20) || 20)])
          .catch((error: unknown) => console.warn("Job berkala gagal", error));
      }, jobEveryMs)
    : null;

  const shutdown = async (): Promise<void> => {
    if (timer) clearInterval(timer);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  console.error("Failed to start backend", error);
  process.exitCode = 1;
});
