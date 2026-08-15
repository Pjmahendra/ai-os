import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { toolRegistry } from "../agents/executor.agent.js";

export async function listTools(
  _req: AuthRequest,
  res: Response
) {
  res.json(
    toolRegistry.list().map((tool) => ({
      name: tool.name,
      description: tool.description
    }))
  );
}
