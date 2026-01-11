import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.ts";
import { getMyLatestResult } from "../controllers/results.me.controller.ts";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/me/latest", getMyLatestResult);

export default router;
