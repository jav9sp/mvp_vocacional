import { z } from "zod";

export const SaveAnswersBodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        value: z.boolean(),
      })
    )
    .min(1)
    .max(25),
  // opcional: el front puede mandar su progreso calculado localmente
  answeredCount: z.number().int().min(0).max(103).optional(),
});

export type SaveAnswersBody = z.infer<typeof SaveAnswersBodySchema>;
