import { z } from "zod";
import { api } from "./api";

export async function apiZ<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init?: RequestInit
): Promise<z.infer<S>> {
  const data = await api<unknown>(path, init);
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    console.error("apiZ schema error:", z.treeifyError(parsed.error), {
      path,
      data,
    });
    // importante: que sea distinguible del resto
    throw Object.assign(new Error("Respuesta inválida del servidor"), {
      code: "SCHEMA_MISMATCH",
      issues: parsed.error.issues,
      data,
      path,
    });
  }

  return parsed.data;
}
