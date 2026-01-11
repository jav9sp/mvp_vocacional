import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import Attempt from "../models/Attempt.model.ts";
import Result from "../models/Result.model.ts";

const AttemptIdParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

export async function getAttemptResult(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsParsed = AttemptIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid attemptId" });
    }
    const { attemptId } = paramsParsed.data;

    const attempt = await Attempt.findByPk(attemptId, {
      attributes: [
        "id",
        "userId",
        "status",
        "answeredCount",
        "finishedAt",
        "testId",
      ],
    });

    if (!attempt)
      return res.status(404).json({ ok: false, error: "Attempt not found" });

    // Ownership
    if (attempt.userId !== req.auth!.userId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    // Si no terminó, devuelve progreso
    if (attempt.status !== "finished") {
      return res.json({
        ok: true,
        status: attempt.status,
        attempt: {
          id: attempt.id,
          answeredCount: attempt.answeredCount,
        },
        result: null,
      });
    }

    // Buscar result persistido
    const result = await Result.findOne({
      where: { attemptId: attempt.id },
      attributes: ["scoresByArea", "scoresByAreaDim", "topAreas", "createdAt"],
    });

    if (!result) {
      // caso raro: finished sin result (inconsistencia)
      return res.status(500).json({
        ok: false,
        error: "Result missing for finished attempt",
      });
    }

    return res.json({
      ok: true,
      status: "finished",
      attempt: {
        id: attempt.id,
        answeredCount: attempt.answeredCount,
        finishedAt: attempt.finishedAt,
      },
      result: {
        scoresByArea: result.scoresByArea,
        scoresByAreaDim: result.scoresByAreaDim,
        topAreas: result.topAreas,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}
