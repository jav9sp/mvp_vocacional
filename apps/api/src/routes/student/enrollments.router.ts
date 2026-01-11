import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.ts";
import {
  getOrCreateAttemptForEnrollment,
  listMyActiveEnrollments,
} from "../../controllers/student.enrollment.controller.ts";

const router = Router();

router.use(requireAuth, requireRole("student"));

// "Mis tests"
router.get("/active", listMyActiveEnrollments);

// Click -> obtiene/crea el attempt para ese enrollment
router.get("/:enrollmentId/attempt", getOrCreateAttemptForEnrollment);

export default router;
