import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  saveAttemptAnswers,
  finishAttempt,
} from "../controllers/attempts.controller.js";

const router = Router();

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
