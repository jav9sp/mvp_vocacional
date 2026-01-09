import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  adminCreatePeriod,
  adminListPeriods,
  adminUpdatePeriod,
} from "../controllers/admin.periods.controller.js";
import { adminListEnrollments } from "../controllers/admin.enrollments.controller.js";
import { adminGetAttemptResult } from "../controllers/admin.results.controller.ts";
import { adminExportPeriodCSV } from "../controllers/admin.export.controller.ts";
import { uploadXlsx } from "../middlewares/upload.middleware.ts";
import { adminImportEnrollmentsXlsx } from "../controllers/admin.import.controller.ts";
import { adminGetPeriodReport } from "../controllers/admin.report.controller.ts";
import { adminGetPeriodReportPdf } from "../controllers/admin.report.pdf.controller.ts";
import {
  getPeriodStudents,
  getPeriodSummary,
} from "../controllers/admin.periods.detail.controller.ts";
import {
  adminGetStudentDetail,
  adminGetStudents,
  adminListStudents,
} from "../controllers/admin.students.controller.ts";
import { adminGetDashboard } from "../controllers/admin.dashboard.controller.ts";
import { adminListTests } from "../controllers/admin.tests.controller.ts";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("admin"), adminGetDashboard);

router.get("/periods", requireAuth, requireRole("admin"), adminListPeriods);
router.post("/periods", requireAuth, requireRole("admin"), adminCreatePeriod);
router.patch(
  "/periods/:periodId",
  requireAuth,
  requireRole("admin"),
  adminUpdatePeriod
);

router.get("/tests", requireAuth, requireRole("admin"), adminListTests);

router.get(
  "/periods/:periodId/enrollments",
  requireAuth,
  requireRole("admin"),
  adminListEnrollments
);
router.get(
  "/periods/:periodId/export.csv",
  requireAuth,
  requireRole("admin"),
  adminExportPeriodCSV
);
router.post(
  "/periods/:periodId/import-xlsx",
  requireAuth,
  requireRole("admin"),
  uploadXlsx.single("file"),
  adminImportEnrollmentsXlsx
);
router.get(
  "/periods/:periodId/report",
  requireAuth,
  requireRole("admin"),
  adminGetPeriodReport
);
router.get(
  "/periods/:periodId/report.pdf",
  requireAuth,
  requireRole("admin"),
  adminGetPeriodReportPdf
);
router.get(
  "/periods/:periodId/summary",
  requireAuth,
  requireRole("admin"),
  getPeriodSummary
);
router.get(
  "/periods/:periodId/students",
  requireAuth,
  requireRole("admin"),
  getPeriodStudents
);

router.get(
  "/attempts/:attemptId/result",
  requireAuth,
  requireRole("admin"),
  adminGetAttemptResult
);

router.get("/students", requireAuth, requireRole("admin"), adminGetStudents);
router.get(
  "/students/:studentId",
  requireAuth,
  requireRole("admin"),
  adminGetStudentDetail
);

export default router;
