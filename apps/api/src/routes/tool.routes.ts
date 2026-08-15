import { Router } from "express";
import { listTools } from "../controllers/tool.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, listTools);

export default router;
