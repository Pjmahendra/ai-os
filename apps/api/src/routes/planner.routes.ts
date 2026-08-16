import { Router } from "express";
import { planner } from "../controllers/planner.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, planner);

export default router;
