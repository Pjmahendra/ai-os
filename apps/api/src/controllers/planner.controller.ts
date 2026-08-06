import { Request, Response } from "express";
import { createPlan } from "../agents/planner.agent.js";

export async function planner(req: Request, res: Response) {
  const { message } = req.body;

  const plan = createPlan(message);

  res.json({
    success: true,
    plan
  });
}
