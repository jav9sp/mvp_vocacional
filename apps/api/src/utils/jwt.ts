import { z } from "zod";
import jwt from "jsonwebtoken";

const JwtUserPayloadSchema = z.object({
  sub: z.number(),
  role: z.union([z.literal("admin"), z.literal("student")]),
  organizationId: z.number(),
});
export type JwtUserPayload = z.infer<typeof JwtUserPayloadSchema>;

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
  const decoded = jwt.verify(token, JWT_SECRET);
  return JwtUserPayloadSchema.parse(decoded);
}
