import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  getOrCreateAttemptForEnrollment,
  listMyActiveEnrollments,
} from "../../controllers/student.enrollment.controller.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

/**
 * @openapi
 * /enrollments/active:
 *   get:
 *     tags: [Enrollments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Lista los enrollments activos del estudiante (Mis Tests)
 *     responses:
 *       200:
 *         description: Lista de tests activos con attempt (si existe)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [enrollmentId, status, period, test, attempt]
 *                     properties:
 *                       enrollmentId: { type: integer, example: 1 }
 *                       status: { type: string, example: "active" }
 *                       period: { $ref: '#/components/schemas/Period' }
 *                       test:
 *                         nullable: true
 *                         $ref: '#/components/schemas/Test'
 *                       attempt:
 *                         nullable: true
 *                         $ref: '#/components/schemas/AttemptSummary'
 *       401:
 *         description: Falta o es inválido el token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /enrollments/{enrollmentId}/attempt:
 *   get:
 *     tags: [Enrollments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtiene o crea (idempotente) el attempt para un enrollment activo
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Attempt listo para comenzar/continuar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 enrollment:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     periodId: { type: integer }
 *                     status: { type: string }
 *                 period: { $ref: '#/components/schemas/Period' }
 *                 attempt: { $ref: '#/components/schemas/AttemptSummary' }
 *       400:
 *         description: enrollmentId inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Enrollment no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Enrollment/period no habilitado (o fuera de org)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */

router.get("/active", listMyActiveEnrollments);

// Click -> obtiene/crea el attempt para ese enrollment
router.get("/:enrollmentId/attempt", getOrCreateAttemptForEnrollment);

export default router;
