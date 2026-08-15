import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";

import {
  createAutomation,
  getUserAutomations,
  getAutomation,
  setAutomationEnabled,
  getAutomationExecutions,
  deleteAutomation
} from "../services/automation.service.js";

import {
  executeStoredAutomation
} from "../services/automation-runner.service.js";


export async function createAutomationController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      workflow,
      config,
      scheduleType,
      schedule
    } = req.body;

    const userId = req.userId;

    if (
      !userId ||
      typeof name !== "string" ||
      typeof workflow !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "name and workflow are required"
      });
    }

    if (
      scheduleType !== undefined &&
      typeof scheduleType !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "scheduleType must be a string"
      });
    }

    if (
      schedule !== undefined &&
      typeof schedule !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "schedule must be a string"
      });
    }

    const automation =
      await createAutomation(
        userId,
        name,
        workflow,
        config ?? {},
        scheduleType,
        schedule
      );

    return res.status(201).json({
      success: true,
      automation
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create automation"
    });
  }
}


export async function listAutomationsController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
    }

    const automations =
      await getUserAutomations(userId);

    return res.json({
      success: true,
      automations
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list automations"
    });
  }
}


export async function getAutomationController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;
    const userId = req.userId;

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: "Automation id is required"
      });
    }

    const automation =
      await getAutomation(
        userId,
        id
      );

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: "Automation not found"
      });
    }

    return res.json({
      success: true,
      automation
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get automation"
    });
  }
}


export async function toggleAutomationController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { enabled } = req.body;
    const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;
    const userId = req.userId;

    if (
      !id ||
      !userId ||
      typeof enabled !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "enabled and automation id are required"
      });
    }

    const result =
      await setAutomationEnabled(
        userId,
        id,
        enabled
      );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Automation not found"
      });
    }

    return res.json({
      success: true,
      enabled
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update automation"
    });
  }
}


export async function deleteAutomationController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;
    const userId = req.userId;

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: "Automation id is required"
      });
    }

    const result =
      await deleteAutomation(
        userId,
        id
      );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Automation not found"
      });
    }

    return res.json({
      success: true,
      message: "Automation deleted"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete automation"
    });
  }
}


export async function executeAutomationController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;
    const userId = req.userId;

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: "Automation id is required"
      });
    }

    const result =
      await executeStoredAutomation(
        userId,
        id
      );

    return res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to execute automation"
    });
  }
}


export async function getAutomationExecutionsController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
  typeof req.params.id === "string"
    ? req.params.id
    : undefined;
    const userId = req.userId;

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: "Automation id is required"
      });
    }

    const executions =
      await getAutomationExecutions(
        userId,
        id
      );

    if (executions === null) {
      return res.status(404).json({
        success: false,
        error: "Automation not found"
      });
    }

    return res.json({
      success: true,
      executions
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get execution history"
    });
  }
}