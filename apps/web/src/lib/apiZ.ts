import { z } from "zod";
import { api } from "./api";

export async function apiZ<S extends z.ZodTypeAny>(
  schema: S,
  path: string,
  init?: RequestInit
): Promise<z.infer<S>> {
  const data = await api<unknown>(path, init);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    // útil para debug: te muestra el shape malo
    console.error("apiZ schema error:", z.treeifyError(parsed.error));
    throw new Error("Respuesta inválida del servidor (schema mismatch)");
  }
  return parsed.data;
}
