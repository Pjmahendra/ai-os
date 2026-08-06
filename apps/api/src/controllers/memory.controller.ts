import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  saveMemory,
  getMemories
} from "../agents/memory.agent.js";

export async function createMemory(
  req: AuthRequest,
  res: Response
) {
  const { content } = req.body;

  const memory = await saveMemory(
    req.userId!,
    content
  );

  res.json(memory);
}

export async function listMemories(
  req: AuthRequest,
  res: Response
) {
  const memories = await getMemories(
    req.userId!
  );

  res.json(memories);
}