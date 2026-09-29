import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import { join } from "node:path";
import { isDatabaseReady } from "./lib/database";
import { usesLocalStorage } from "./lib/storage";
import authRouter from "./routes/auth";
import ordersRouter from "./routes/orders";
import usersRouter from "./routes/users";
import meRouter from "./routes/me";
import eventsRouter from "./routes/events";
import paymentsRouter from "./routes/payments";
import ticketsRouter from "./routes/tickets";
import auditLogsRouter from "./routes/audit-logs";
import jobsRouter from "./routes/jobs";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { requestContext } from "./middlewares/request-context";

const app = express();

app.disable("x-powered-by");
app.set("etag", false);
app.use(requestContext);
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ??
      false,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

const healthHandler: RequestHandler = (_request, response) => {
  response.status(200).json({
    data: {
      status: "ok",
    },
  });
};

const readinessHandler: RequestHandler = (_request, response) => {
  const databaseReady = isDatabaseReady();
  const payload = {
    data: {
      status: databaseReady ? "ready" : "unavailable",
      checks: {
        database: databaseReady ? "ok" : "unavailable",
      },
    },
  };

  response.status(databaseReady ? 200 : 503).json(payload);
};

app.get("/api/v1/health", healthHandler);
app.get("/api/v1/health/ready", readinessHandler);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/me", meRouter);
app.use("/api/v1/events", eventsRouter);
// Tanpa kredensial Supabase, poster disimpan lokal dan dilayani dari sini.
if (usesLocalStorage) app.use("/uploads", express.static(join(process.cwd(), "uploads"), { maxAge: "1y", index: false }));
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/audit-logs", auditLogsRouter);
// Endpoint internal untuk cron (Vercel Cron / scheduler eksternal); bukan bagian kontrak publik.
app.use("/api/v1/internal/jobs", jobsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
