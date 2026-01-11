import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import User from "../models/User.model.ts";
import { signAccessToken } from "../utils/jwt.ts";

const LoginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const parsed = LoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid body",
      details: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;

  // Busca usuario por email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  // Valida password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const token = signAccessToken({
    sub: user.id,
    role: user.role,
    organizationId: user.organizationId,
  });

  return res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    },
  });
}
