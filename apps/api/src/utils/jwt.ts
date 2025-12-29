// apps/api/src/utils/jwt.ts
import jwt from "jsonwebtoken";

export type JwtUserPayload = {
  sub: number; // userId
  role: "admin" | "student";
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const JWT_SECRET = required("JWT_SECRET", process.env.JWT_SECRET);

export function signAccessToken(payload: JwtUserPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "8h",
  });
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
}
