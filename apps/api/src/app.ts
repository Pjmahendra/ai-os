import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import plannerRoutes from "./routes/planner.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import memoryRoutes from "./routes/memory.routes.js";
import toolRoutes from "./routes/tool.routes.js";
const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));
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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export default app;