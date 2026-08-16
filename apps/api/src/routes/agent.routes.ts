import { Router } from "express";
import { runAgent } from "../controllers/agent.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  runAgent
);

export default router;