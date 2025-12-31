import { z } from "zod";
import Attempt from "../models/Attempt.model.js";
import Result from "../models/Result.model.js";

const ParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

export async function adminGetAttemptResult(req: any, res: any) {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid attemptId" });

  const { attemptId } = parsed.data;

  const attempt = await Attempt.findByPk(attemptId, {
    attributes: [
      "id",
      "status",
      "answeredCount",
      "finishedAt",
      "userId",
      "testId",
    ],
  });

  if (!attempt)
    return res.status(404).json({ ok: false, error: "Attempt not found" });

  const result = await Result.findOne({
    where: { attemptId: attempt.id },
    attributes: ["scoresByArea", "scoresByAreaDim", "topAreas", "createdAt"],
  });

  return res.json({
    ok: true,
    attempt: {
      id: attempt.id,
      status: attempt.status,
      answeredCount: attempt.answeredCount,
      finishedAt: attempt.finishedAt,
      userId: attempt.userId,
      testId: attempt.testId,
    },
    result: result
      ? {
          scoresByArea: result.scoresByArea,
          scoresByAreaDim: result.scoresByAreaDim,
          topAreas: result.topAreas,
          createdAt: result.createdAt,
        }
      : null,
  });
}
