import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.ts";
import {
  getAttemptContext,
  getAttemptAnswers,
  saveAttemptAnswers,
  finishAttempt,
} from "../../controllers/attempts.controller.ts";
import { getAttemptResult } from "../../controllers/results.controller.ts";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/:attemptId", getAttemptContext);
router.get("/:attemptId/result", getAttemptResult);
router.get("/:attemptId/answers", getAttemptAnswers);
router.put("/:attemptId/answers", saveAttemptAnswers);
router.post("/:attemptId/finish", finishAttempt);

export default router;
