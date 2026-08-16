import { Router } from "express";
import { me, updateSettings } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateSettings);

export default router;