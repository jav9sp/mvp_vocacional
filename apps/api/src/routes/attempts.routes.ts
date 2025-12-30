import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  getAttemptAnswers,
  saveAttemptAnswers,
  finishAttempt,
} from "../controllers/attempts.controller.js";

const router = Router();

router.get(
  "/:attemptId/answers",
  requireAuth,
  requireRole("student"),
  getAttemptAnswers
);
router.put(
  "/:attemptId/answers",
  requireAuth,
  requireRole("student"),
  saveAttemptAnswers
);
router.post(
  "/:attemptId/finish",
  requireAuth,
  requireRole("student"),
  finishAttempt
);

export default router;
