import { Router } from "express";
import {
  createMemory,
  listMemories
} from "../controllers/memory.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createMemory);
router.get("/", authenticate, listMemories);

export default router;
