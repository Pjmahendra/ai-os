import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";

import {
  generateAIReplyController,
  generateAINewController,
  createDraftController,
  listDraftsController,
  getDraftController,
  updateDraftController,
  deleteDraftController
} from "../controllers/email-draft.controller.js";

const router = Router();

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

export default router;
