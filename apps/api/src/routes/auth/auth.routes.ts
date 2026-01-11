import { Router, Request, Response, NextFunction } from "express";
import { login } from "../../controllers/auth.controller.ts";
import { requireAuth } from "../../middlewares/auth.middleware.ts";
import User from "../../models/User.model.ts";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login y entrega JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "juan@correo.com" }
 *               password: { type: string, example: "secret" }
 *     responses:
 *       200:
 *         description: Login OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 accessToken: { type: string, example: "eyJhbGciOi..." }
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Devuelve el usuario autenticado
 *     responses:
 *       200:
 *         description: Usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 user: { $ref: '#/components/schemas/UserMe' }
 *       401:
 *         description: Falta o es inválido el token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/login", login);

router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findByPk(req.auth!.userId, {
        attributes: [
          "id",
          "role",
          "name",
          "email",
          "mustChangePassword",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!user)
        return res.status(404).json({ ok: false, error: "User not found" });

      return res.json({ ok: true, user });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
