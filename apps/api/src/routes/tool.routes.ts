import { Router } from "express";
import { listTools } from "../controllers/tool.controller.js";

const router = Router();

router.get("/", listTools);

export default router;
