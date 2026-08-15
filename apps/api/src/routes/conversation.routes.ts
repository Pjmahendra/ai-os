import { Router } from "express";

import {
  getConversationMessagesController,
  listConversationsController
} from "../controllers/conversation.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  listConversationsController
);

router.get(
  "/:id/messages",
  authenticate,
  getConversationMessagesController
);

export default router;
