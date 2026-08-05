import { Request, Response } from "express";
import { createPlan } from "../agents/planner.agent.js";
import { executePlan } from "../agents/executor.agent.js";

export async function runAgent(
  req: Request,
  res: Response
) {
  const { message } = req.body;

  const plan = createPlan(message);

  const execution = await executePlan(plan);

  res.json({
    success: true,
    plan,
    execution
  });
}