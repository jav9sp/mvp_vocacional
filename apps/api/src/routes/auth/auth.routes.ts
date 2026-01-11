import { Router, Request, Response, NextFunction } from "express";
import { login } from "./auth.controller.ts";
import { requireAuth } from "../../middlewares/auth.middleware.ts";
import User from "../../models/User.model.ts";

const router = Router();

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
