import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { listInboxThreads, getThread } from "../services/email.service.js";

export async function listThreadsController(
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

    const maxResults =
      typeof req.query.maxResults === "string"
        ? Number(req.query.maxResults)
        : undefined;
    const pageToken =
      typeof req.query.pageToken === "string"
        ? req.query.pageToken
        : undefined;

    const { threads, nextPageToken } = await listInboxThreads(
      userId,
      { maxResults, pageToken }
    );

    return res.json({
      success: true,
      threads,
      nextPageToken
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list inbox threads"
    });
  }
}

export async function getThreadController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const id =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;

    if (!userId || !id) {
      return res.status(400).json({
        success: false,
        error: "Thread id is required"
      });
    }

    const thread = await getThread(userId, id);

    return res.json({
      success: true,
      thread
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get thread"
    });
  }
}
