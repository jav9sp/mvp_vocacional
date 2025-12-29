import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { getAttemptResult } from "../controllers/results.controller.js";
import { getMyLatestResult } from "../controllers/results.me.controller.js";

const router = Router();

// student ve su propio resultado por attemptId
router.get(
  "/attempts/:attemptId/result",
  requireAuth,
  requireRole("student"),
  getAttemptResult
);

router.get(
  "/me/result",
  requireAuth,
  requireRole("student"),
  getMyLatestResult
);

export default router;
