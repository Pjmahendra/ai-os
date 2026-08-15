import { Router } from "express";
import {
  createMemoryController,
  deleteMemoryController,
  getMemoryController,
  listMemoriesController,
  updateMemoryController
} from "../controllers/memory.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createMemoryController);
router.get("/", authenticate, listMemoriesController);
router.get("/:id", authenticate, getMemoryController);
router.patch("/:id", authenticate, updateMemoryController);
router.delete("/:id", authenticate, deleteMemoryController);

export default router;
