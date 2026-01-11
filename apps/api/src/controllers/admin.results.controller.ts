import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import Attempt from "../models/Attempt.model.ts";
import Result from "../models/Result.model.ts";
import Period from "../models/Period.model.ts";

const ParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

export async function adminGetAttemptResult(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Para filtrar por intentos de la organización
  const { organizationId } = req.auth!;
  try {
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
      include: [
        {
          model: Period,
          as: "period",
          attributes: ["id", "organizationId"],
          where: { organizationId },
          required: true,
        },
      ],
    });

    if (!attempt)
      return res.status(404).json({ ok: false, error: "Attempt not found" });

    const result = await Result.findOne({
      where: { attemptId: attempt.id },
      attributes: ["scoresByArea", "scoresByAreaDim", "topAreas", "createdAt"],
    });

    const resultState = result ? "present" : "missing";

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
      resultState,
      result: result
        ? {
            scoresByArea: result.scoresByArea,
            scoresByAreaDim: result.scoresByAreaDim,
            topAreas: result.topAreas,
            createdAt: result.createdAt,
          }
        : null,
    });
  } catch (error) {
    return next(error);
  }
}
