import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase, disconnectDatabase } from "./lib/database";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

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
