import { Request, Response } from "express";
import { registry } from "../tools/registry.js";

export async function listTools(
  _req: Request,
  res: Response
) {
  res.json(registry.list());
}
