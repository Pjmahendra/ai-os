import { Response } from "express";
import { prisma } from "@ai-os/database";
import { AuthRequest } from "../middleware/auth.middleware.js";

export async function me(
  req: AuthRequest,
  res: Response
) {
  const user = await prisma.user.findUnique({
    where: {
      id: req.userId
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  });

  return res.json(user);
}