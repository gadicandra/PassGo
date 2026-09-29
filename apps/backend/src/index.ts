import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./lib/database";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  await connectDatabase();

  const server = app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });

  const shutdown = async (): Promise<void> => {
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
