// apps/api/src/middlewares/auth.middleware.ts
import { verifyAccessToken } from "../utils/jwt.js";

export type AuthContext = {
  userId: number;
  role: "admin" | "student";
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") {
    return res
      .status(401)
      .json({ ok: false, error: "Missing Authorization header" });
  }

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid Authorization header" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      organizationId: payload.organizationId,
    };
    return next();
  } catch {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid or expired token" });
  }
}

export function requireRole(role: AuthContext["role"]) {
  return (req: any, res: any, next: any) => {
    if (!req.auth) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    if (req.auth.role !== role) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    return next();
  };
}
