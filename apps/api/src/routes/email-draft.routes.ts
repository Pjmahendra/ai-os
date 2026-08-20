import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.middleware.js";

import {
  generateAIReplyController,
  generateAINewController,
  createDraftController,
  listDraftsController,
  getDraftController,
  updateDraftController,
  deleteDraftController,
  sendDraftController
} from "../controllers/email-draft.controller.js";

const router = Router();

// This is the one genuinely irreversible action in the whole email
// feature - a much tighter ceiling than the general API limiter, and
// tighter than the OAuth limiter too.
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many send attempts. Please wait before trying again."
  }
});

router.post(
  "/drafts/ai-reply",
  authenticate,
  generateAIReplyController
);
router.post(
  "/drafts/ai-new",
  authenticate,
  generateAINewController
);
router.post("/drafts", authenticate, createDraftController);
router.get("/drafts", authenticate, listDraftsController);
router.get("/drafts/:id", authenticate, getDraftController);
router.patch("/drafts/:id", authenticate, updateDraftController);
router.delete("/drafts/:id", authenticate, deleteDraftController);
router.post(
  "/drafts/:id/send",
  authenticate,
  sendLimiter,
  sendDraftController
);

export default router;
