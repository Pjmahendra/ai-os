import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  searchMemories,
  updateMemory
} from "../services/memory.service.js";

export async function createMemoryController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { content, summary } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
    }

    if (
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "content is required"
      });
    }

    const memory = await createMemory(
      userId,
      content,
      typeof summary === "string" ? summary : undefined
    );

    return res.status(201).json({
      success: true,
      memory
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create memory"
    });
  }
}

export async function listMemoriesController(
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

    const query =
      typeof req.query.query === "string"
        ? req.query.query
        : undefined;

    const memories = query
      ? await searchMemories(userId, query)
      : await listMemories(userId);

    return res.json({
      success: true,
      memories
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list memories"
    });
  }
}

export async function getMemoryController(
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
        error: "Memory id is required"
      });
    }

    const memory = await getMemory(userId, id);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: "Memory not found"
      });
    }

    return res.json({
      success: true,
      memory
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get memory"
    });
  }
}

export async function updateMemoryController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;
    const userId = req.userId;
    const { content, summary } = req.body;

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: "Memory id is required"
      });
    }

    if (
      content === undefined &&
      summary === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "content and/or summary is required"
      });
    }

    const memory = await updateMemory(
      userId,
      id,
      {
        ...(typeof content === "string"
          ? { content }
          : {}),
        ...(typeof summary === "string"
          ? { summary }
          : {})
      }
    );

    return res.json({
      success: true,
      memory
    });
  } catch (error) {
    console.error(error);

    const notFound =
      error instanceof Error &&
      error.message === "Memory not found";

    return res.status(notFound ? 404 : 500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update memory"
    });
  }
}

export async function deleteMemoryController(
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
        error: "Memory id is required"
      });
    }

    await deleteMemory(userId, id);

    return res.json({
      success: true,
      message: "Memory deleted"
    });
  } catch (error) {
    console.error(error);

    const notFound =
      error instanceof Error &&
      error.message === "Memory not found";

    return res.status(notFound ? 404 : 500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete memory"
    });
  }
}
