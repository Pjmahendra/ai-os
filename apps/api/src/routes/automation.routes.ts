import { Router } from "express";

import {
  createAutomationController,
  listAutomationsController,
  getAutomationController,
  toggleAutomationController,
  deleteAutomationController,
  executeAutomationController,
  getAutomationExecutionsController
} from "../controllers/automation.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { runScheduledAutomations } from "../services/automation.scheduler.js";

const router = Router();

router.post(
  "/",
  authenticate,
  createAutomationController
);
router.post(
  "/scheduler/run",
  authenticate,
  async (_req, res) => {
    try {
      await runScheduledAutomations();

      return res.json({
        success: true,
        message: "Scheduler check completed"
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Scheduler failed"
      });
    }
  }
);
router.post(
  "/:id/execute",
  authenticate,
  executeAutomationController
);

router.get(
  "/",
  authenticate,
  listAutomationsController
);

router.get(
  "/:id",
  authenticate,
  getAutomationController
);

router.patch(
  "/:id/toggle",
  authenticate,
  toggleAutomationController
);

router.delete(
  "/:id",
  authenticate,
  deleteAutomationController
);

router.get(
  "/:id/executions",
  authenticate,
  getAutomationExecutionsController
);

export default router;
