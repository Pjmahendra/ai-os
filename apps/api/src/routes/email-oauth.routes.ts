import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  connectController,
  callbackController,
  listAccountsController,
  disconnectAccountController
} from "../controllers/email-oauth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// State-guessing/replay against the OAuth callback is a narrow but
// real attack surface, and the connect route triggers an external
// redirect - both get a tighter ceiling than the general API limiter.
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// No `authenticate` here deliberately: this is a full-page redirect
// triggered by an in-app button click, so it CAN carry a normal
// Authorization header, but the controller also accepts the JWT as a
// ?token= query param as a fallback for callers that can't set
// headers on a top-level navigation.
router.get(
  "/oauth/connect",
  oauthLimiter,
  connectController
);

// No `authenticate`: Google's redirect is an unauthenticated GET that
// can't carry a bearer token at all - the controller recovers the
// user from the signed `state` param instead.
router.get(
  "/oauth/callback",
  oauthLimiter,
  callbackController
);

router.get(
  "/accounts",
  authenticate,
  listAccountsController
);

router.delete(
  "/accounts/:id",
  authenticate,
  disconnectAccountController
);

export default router;
