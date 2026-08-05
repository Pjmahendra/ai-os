import { Router } from "express";
import { planner } from "../controllers/planner.controller.js";

const router = Router();

router.post("/", planner);

export default router;
