import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "@ai-os/config";

export interface AuthRequest extends Request {
  userId?: string;
}

interface TokenPayload extends JwtPayload {
  userId: string;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  try {
    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET!
    );

    if (
      typeof decoded === "string" ||
      !("userId" in decoded)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    req.userId = (decoded as TokenPayload).userId;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
}