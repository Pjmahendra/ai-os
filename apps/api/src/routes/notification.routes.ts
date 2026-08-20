import { Router } from "express";

import {
  listNotificationsController,
  unreadCountController,
  markReadController,
  markAllReadController
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authenticate,
  listNotificationsController
);

router.get(
  "/unread-count",
  authenticate,
  unreadCountController
);

router.patch(
  "/read-all",
  authenticate,
  markAllReadController
);

router.patch(
  "/:id/read",
  authenticate,
  markReadController
);

export default router;
