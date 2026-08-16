import { Response } from "express";
import { prisma } from "../database/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { isValidTimezone } from "../utils/timezone.js";

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
      timezone: true,
      createdAt: true
    }
  });

  return res.json(user);
}

export async function updateSettings(
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

    const { name, timezone } = req.body;

    if (
      name !== undefined &&
      typeof name !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "name must be a string"
      });
    }

    if (timezone !== undefined) {
      if (
        typeof timezone !== "string" ||
        !isValidTimezone(timezone)
      ) {
        return res.status(400).json({
          success: false,
          error: "timezone must be a valid IANA timezone name (e.g. \"America/New_York\")"
        });
      }
    }

    const user = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(timezone !== undefined ? { timezone } : {})
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true
      }
    });

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update settings"
    });
  }
}
