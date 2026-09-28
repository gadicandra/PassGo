import cors from "cors";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import helmet from "helmet";
import { isDatabaseReady } from "./lib/database";

const app = express();

app.disable("x-powered-by");
app.set("etag", false);
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ?? false,
  credentials: true,
}));
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

const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).type("application/problem+json").json({
    type: `${process.env.PROBLEM_TYPE_BASE ?? "about:blank"}#route-not-found`,
    title: "Route not found",
    status: 404,
    detail: `Route ${request.method} ${request.path} tidak ditemukan.`,
    code: "route-not-found",
  });
};

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).type("application/problem+json").json({
    type: `${process.env.PROBLEM_TYPE_BASE ?? "about:blank"}#internal-error`,
    title: "Internal server error",
    status: 500,
    detail: process.env.NODE_ENV === "production" ? "Terjadi kesalahan internal." : error.message,
    code: "internal-error",
  });
};

app.use(notFoundHandler);
app.use(errorHandler);

export default app;