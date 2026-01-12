import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { getMyLatestResult } from "../../controllers/results.me.controller.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

/**
 * @openapi
 * /results/me/latest:
 *   get:
 *     tags: [Results]
 *     security: [{ bearerAuth: [] }]
 *     summary: Devuelve el último resultado del estudiante (atajo)
 *     responses:
 *       200:
 *         description: Último resultado o estado no iniciado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 status: { type: string, example: "not_started" }
 *                 attempt: { nullable: true, example: null }
 *                 result: { nullable: true, example: null }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get("/me/latest", getMyLatestResult);

export default router;
