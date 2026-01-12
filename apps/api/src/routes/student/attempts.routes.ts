import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import {
  getAttemptContext,
  getAttemptAnswers,
  saveAttemptAnswers,
  finishAttempt,
} from "../../controllers/attempts.controller.js";
import { getAttemptResult } from "../../controllers/results.controller.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

/**
 * @openapi
 * /attempts/{attemptId}:
 *   get:
 *     tags: [Attempts]
 *     security: [{ bearerAuth: [] }]
 *     summary: Devuelve el contexto del attempt (test + period + questions)
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Contexto del test para rendir
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 test: { $ref: '#/components/schemas/Test' }
 *                 period: { $ref: '#/components/schemas/Period' }
 *                 attempt: { $ref: '#/components/schemas/AttemptSummary' }
 *                 areas:
 *                   type: array
 *                   items: { type: string }
 *                 questions:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Question' }
 *       400:
 *         description: attemptId inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden (no es dueño o fuera de org)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Attempt no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /attempts/{attemptId}/answers:
 *   get:
 *     tags: [Attempts]
 *     security: [{ bearerAuth: [] }]
 *     summary: Devuelve las respuestas guardadas del attempt
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Respuestas del attempt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 attempt:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     status: { type: string }
 *                     answeredCount: { type: integer }
 *                     testId: { type: integer }
 *                 answers:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AnswerItem' }
 *       400:
 *         description: attemptId inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Attempt no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   put:
 *     tags: [Attempts]
 *     security: [{ bearerAuth: [] }]
 *     summary: Guarda (upsert) respuestas del attempt
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answeredCount: { type: integer, example: 12 }
 *               answers:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/AnswerItem' }
 *     responses:
 *       200:
 *         description: Guardado OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 attempt:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     status: { type: string }
 *                     answeredCount: { type: integer }
 *       400:
 *         description: Body inválido o attemptId inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Attempt no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Attempt terminado (no editable)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /attempts/{attemptId}/finish:
 *   post:
 *     tags: [Attempts]
 *     security: [{ bearerAuth: [] }]
 *     summary: Finaliza el attempt y persiste el resultado (idempotente)
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Resultado final
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 status: { type: string, example: "finished" }
 *                 attempt:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     answeredCount: { type: integer }
 *                     finishedAt: { type: string, format: "date-time", nullable: true }
 *                 result: { $ref: '#/components/schemas/ResultPayload' }
 *       400:
 *         description: Attempt incompleto o attemptId inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Attempt no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: No finishable
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /attempts/{attemptId}/result:
 *   get:
 *     tags: [Results]
 *     security: [{ bearerAuth: [] }]
 *     summary: Devuelve el resultado de un attempt (o progreso si no está finalizado)
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Resultado o progreso
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     ok: { type: boolean, example: true }
 *                     status: { type: string, example: "in_progress" }
 *                     attempt:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         answeredCount: { type: integer }
 *                     result: { nullable: true, example: null }
 *                 - type: object
 *                   properties:
 *                     ok: { type: boolean, example: true }
 *                     status: { type: string, example: "finished" }
 *                     attempt:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         answeredCount: { type: integer }
 *                         finishedAt: { type: string, format: "date-time", nullable: true }
 *                     result: { $ref: '#/components/schemas/ResultPayload' }
 *       400:
 *         description: attemptId inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Attempt no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/:attemptId", getAttemptContext);
router.get("/:attemptId/result", getAttemptResult);
router.get("/:attemptId/answers", getAttemptAnswers);
router.put("/:attemptId/answers", saveAttemptAnswers);
router.post("/:attemptId/finish", finishAttempt);

export default router;
