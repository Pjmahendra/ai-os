import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service.js";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password, name } = req.body;

    const result = await authService.register(
      email,
      password,
      name
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    const result = await authService.login(
      email,
      password
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}