import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import { isDatabaseReady } from "./lib/database";
import authRouter from "./routes/auth";
import ordersRouter from "./routes/orders";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";

const app = express();

app.disable("x-powered-by");
app.set("etag", false);
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
