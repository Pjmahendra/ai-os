import { Request, Response } from "express";
import { AIPlanner } from "@ai-os/ai-planner";

const aiPlanner = new AIPlanner();

export async function planner(
  req: Request,
  res: Response
) {
  try {
    const { message } = req.body;

    const plan = await aiPlanner.createPlan(message);

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Planner failed"
    });
  }
}