import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { pinoHttp } from "pino-http";
import rateLimit from "express-rate-limit";

import { logger } from "./config/logger.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import plannerRoutes from "./routes/planner.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import memoryRoutes from "./routes/memory.routes.js";
import toolRoutes from "./routes/tool.routes.js";
import automationRoutes from "./routes/automation.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import { startScheduler } from "./services/scheduler.js";
const app = express();

// Trust the first hop's X-Forwarded-For (typical single reverse-proxy
// deployment) so rate limiting keys on the real client IP, not the
// proxy's.
app.set("trust proxy", 1);

// In production, restrict to the configured frontend origin(s)
// (comma-separated) instead of allowing every origin. Left permissive
// by default so local dev keeps working without extra setup.
const allowedOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors(
    allowedOrigins?.length
      ? { origin: allowedOrigins }
      : undefined
  )
);
app.use(compression());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/health"
    }
  })
);

// A generous ceiling on every /api route — this is meant to blunt
// abuse/runaway clients, not to constrain normal use.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

// Auth endpoints are a brute-force/credential-stuffing target and
// don't need anywhere near the general ceiling.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many attempts. Please try again later."
  }
});

app.use("/api", apiLimiter);

app.use("/api/planner", plannerRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/tools", toolRoutes);

app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/automations",
  automationRoutes
);
app.use(
  "/api/conversations",
  conversationRoutes
);

// Error-handling middleware must be registered after all routes —
// Express only routes errors to handlers mounted after the route
// that threw, so this has to stay last.
app.use((err: any, req: any, res: any, _next: any) => {
  (req.log ?? logger).error(
    { err },
    "Unhandled request error"
  );

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

startScheduler();
export default app;
