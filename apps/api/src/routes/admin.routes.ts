import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  adminCreatePeriod,
  adminListPeriods,
  adminUpdatePeriod,
} from "../controllers/admin.periods.controller.js";
import { adminListEnrollments } from "../controllers/admin.enrollments.controller.js";
import { adminGetAttemptResult } from "../controllers/admin.results.controller.js";
import { adminExportPeriodCSV } from "../controllers/admin.export.controller.js";
import { uploadXlsx } from "../middlewares/upload.middleware.js";
import { adminImportEnrollmentsXlsx } from "../controllers/admin.import.controller.js";
import { adminGetPeriodReport } from "../controllers/admin.report.controller.js";
import { adminGetPeriodReportPdf } from "../controllers/admin.report.pdf.controller.js";
import {
  getPeriodStudents,
  getPeriodSummary,
} from "../controllers/admin.periods.detail.controller.js";
import {
  adminGetStudentDetail,
  adminGetStudents,
} from "../controllers/admin.students.controller.js";
import { adminGetDashboard } from "../controllers/admin.dashboard.controller.js";
import { adminListTests } from "../controllers/admin.tests.controller.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", adminGetDashboard);

router.get("/periods", adminListPeriods);
router.post("/periods", adminCreatePeriod);
router.patch("/periods/:periodId", adminUpdatePeriod);

router.get("/tests", adminListTests);

router.get("/periods/:periodId/enrollments", adminListEnrollments);
router.get("/periods/:periodId/export/csv", adminExportPeriodCSV);
router.post(
  "/periods/:periodId/import-xlsx",
  uploadXlsx.single("file"),
  adminImportEnrollmentsXlsx
);
router.get("/periods/:periodId/report", adminGetPeriodReport);
router.get("/periods/:periodId/report/pdf", adminGetPeriodReportPdf);
router.get("/periods/:periodId/summary", getPeriodSummary);
router.get("/periods/:periodId/students", getPeriodStudents);

router.get("/attempts/:attemptId/result", adminGetAttemptResult);

router.get("/students", adminGetStudents);
router.get("/students/:studentId", adminGetStudentDetail);

export default router;
