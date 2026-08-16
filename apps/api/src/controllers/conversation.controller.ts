import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";

import {
  getConversationMessages,
  listConversations
} from "../services/conversation.service.js";

export async function listConversationsController(
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

    const conversations = await listConversations(userId);

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list conversations"
    });
  }
}

export async function getConversationMessagesController(
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
        error: "Conversation id is required"
      });
    }

    const messages = await getConversationMessages(
      userId,
      id
    );

    if (messages === null) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found"
      });
    }

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get conversation messages"
    });
  }
}
