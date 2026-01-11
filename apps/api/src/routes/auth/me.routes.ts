import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.ts";
import User from "../../models/User.model.ts";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
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
});

export default router;
