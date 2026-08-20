import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";

import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead
} from "../services/notification.service.js";

export async function listNotificationsController(
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

    const unreadOnly = req.query.unread === "true";

    const notifications =
      await listNotifications(userId, {
        unreadOnly
      });

    return res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list notifications"
    });
  }
}

export async function unreadCountController(
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

    const count = await getUnreadCount(userId);

    return res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get unread count"
    });
  }
}

export async function markReadController(
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
        error: "Notification id is required"
      });
    }

    const result = await markRead(userId, id);

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Notification not found"
      });
    }

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark notification read"
    });
  }
}

export async function markAllReadController(
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

    await markAllRead(userId);

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark notifications read"
    });
  }
}
