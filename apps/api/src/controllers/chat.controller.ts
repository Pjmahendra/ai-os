import { Request, Response } from "express";
import { runAgent } from "../core/agent/ai.engine.js";

export async function chatController(
  req: Request,
  res: Response
) {
  try {
    const { message, userId } = req.body;

    const reply = await runAgent(
      userId,
      message
    );

    res.json({
      success: true,
      reply
    });
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}