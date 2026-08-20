import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  listThreadsController,
  getThreadController
} from "../controllers/email.controller.js";

const router = Router();

router.get("/threads", authenticate, listThreadsController);
router.get("/threads/:id", authenticate, getThreadController);

export default router;
