import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.ts";
import { getCurrentTest } from "../controllers/test.controller.ts";

const router = Router();

router.get("/current", requireAuth, requireRole("student"), getCurrentTest);

export default router;
