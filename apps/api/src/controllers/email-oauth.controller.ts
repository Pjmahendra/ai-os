import { Response } from "express";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { env } from "@ai-os/config";
import { AuthRequest } from "../middleware/auth.middleware.js";

import {
  getAuthUrl,
  exchangeCodeForTokens
} from "../services/google-oauth.service.js";

import {
  connectAccount,
  disconnectAccount,
  getAccountForUser
} from "../services/email-account.service.js";

const STATE_PURPOSE = "gmail-oauth-state";
// Generous enough to survive 2FA prompts, account pickers, or a user
// needing to go fix something (e.g. add themselves as a Google Cloud
// test user) mid-flow and coming back to the same link.
const STATE_TTL = "15m";

// This is a full-page browser redirect, not a fetch() call, so it
// can't carry an Authorization header - the frontend passes the JWT
// as a query param instead. Accept either, since a future
// server-to-server caller could still use the header.
function resolveUserId(req: AuthRequest): string | undefined {
  if (req.userId) {
    return req.userId;
  }

  const queryToken = req.query.token;

  if (typeof queryToken !== "string") {
    return undefined;
  }

  try {
    const decoded = jwt.verify(queryToken, env.JWT_SECRET!);

    if (
      typeof decoded === "string" ||
      !("userId" in decoded)
    ) {
      return undefined;
    }

    return (decoded as { userId: string }).userId;
  } catch {
    return undefined;
  }
}

export async function connectController(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
    }

    const state = jwt.sign(
      { userId, purpose: STATE_PURPOSE },
      env.JWT_SECRET!,
      { expiresIn: STATE_TTL }
    );

    const url = getAuthUrl(state);

    return res.redirect(url);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start Gmail connection"
    });
  }
}

const FRONTEND_URL =
  process.env.CORS_ORIGIN?.split(",")[0]?.trim() ??
  "http://localhost:5173";

export async function callbackController(
  req: AuthRequest,
  res: Response
) {
  const code =
    typeof req.query.code === "string"
      ? req.query.code
      : undefined;
  const state =
    typeof req.query.state === "string"
      ? req.query.state
      : undefined;

  if (!code || !state) {
    return res.redirect(
      `${FRONTEND_URL}/settings?gmail=error`
    );
  }

  try {
    const decoded = jwt.verify(state, env.JWT_SECRET!);

    if (
      typeof decoded === "string" ||
      (decoded as { purpose?: string }).purpose !== STATE_PURPOSE
    ) {
      return res.redirect(
        `${FRONTEND_URL}/settings?gmail=error`
      );
    }

    const userId = (decoded as { userId: string }).userId;

    const tokens = await exchangeCodeForTokens(code);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client
    });

    const profile = await gmail.users.getProfile({
      userId: "me"
    });

    const email = profile.data.emailAddress;

    if (!email) {
      throw new Error(
        "Google did not return the connected account's email address."
      );
    }

    await connectAccount(userId, email, tokens);

    return res.redirect(
      `${FRONTEND_URL}/settings?gmail=connected`
    );
  } catch (error) {
    console.error(
      "Gmail OAuth callback failed:",
      error
    );

    return res.redirect(
      `${FRONTEND_URL}/settings?gmail=error`
    );
  }
}

export async function listAccountsController(
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

    const account = await getAccountForUser(userId);

    return res.json({
      success: true,
      account: account
        ? {
            id: account.id,
            email: account.email,
            connectedAt: account.connectedAt
          }
        : null
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list Gmail accounts"
    });
  }
}

export async function disconnectAccountController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;
    const userId = req.userId;

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        error: "Account id is required"
      });
    }

    const result = await disconnectAccount(userId, id);

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Gmail account not found"
      });
    }

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to disconnect Gmail account"
    });
  }
}
