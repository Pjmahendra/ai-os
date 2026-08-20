import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { listMemories } from "../services/memory.service.js";

import {
  generateAIReply,
  generateAINew,
  createDraft,
  listDrafts,
  getDraft,
  updateDraft,
  deleteDraft
} from "../services/email-draft.service.js";

export async function generateAIReplyController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const { threadId, instruction } = req.body;

    if (
      !userId ||
      typeof threadId !== "string" ||
      typeof instruction !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "threadId and instruction are required"
      });
    }

    const draft = await generateAIReply(userId, threadId, instruction);

    return res.status(201).json({ success: true, draft });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate AI reply"
    });
  }
}

export async function generateAINewController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const { to, instruction } = req.body;

    if (
      !userId ||
      typeof to !== "string" ||
      typeof instruction !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "to and instruction are required"
      });
    }

    const memories = await listMemories(userId);

    const draft = await generateAINew(
      userId,
      to,
      instruction,
      memories.map((m) => m.summary ?? m.content)
    );

    return res.status(201).json({ success: true, draft });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate AI draft"
    });
  }
}

export async function createDraftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const { to, subject, body } = req.body;

    if (
      !userId ||
      typeof to !== "string" ||
      typeof subject !== "string" ||
      typeof body !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "to, subject, and body are required"
      });
    }

    const draft = await createDraft(userId, { to, subject, body });

    return res.status(201).json({ success: true, draft });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create draft"
    });
  }
}

export async function listDraftsController(
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

    const drafts = await listDrafts(userId);

    return res.json({ success: true, drafts });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list drafts"
    });
  }
}

export async function getDraftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const id =
      typeof req.params.id === "string" ? req.params.id : undefined;

    if (!userId || !id) {
      return res.status(400).json({
        success: false,
        error: "Draft id is required"
      });
    }

    const draft = await getDraft(userId, id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: "Draft not found"
      });
    }

    return res.json({ success: true, draft });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get draft"
    });
  }
}

export async function updateDraftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const id =
      typeof req.params.id === "string" ? req.params.id : undefined;
    const { to, subject, body } = req.body;

    if (!userId || !id) {
      return res.status(400).json({
        success: false,
        error: "Draft id is required"
      });
    }

    const result = await updateDraft(userId, id, {
      ...(typeof to === "string" ? { to } : {}),
      ...(typeof subject === "string" ? { subject } : {}),
      ...(typeof body === "string" ? { body } : {})
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Draft not found, or it has already been sent"
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update draft"
    });
  }
}

export async function deleteDraftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.userId;
    const id =
      typeof req.params.id === "string" ? req.params.id : undefined;

    if (!userId || !id) {
      return res.status(400).json({
        success: false,
        error: "Draft id is required"
      });
    }

    const result = await deleteDraft(userId, id);

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Draft not found"
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete draft"
    });
  }
}
