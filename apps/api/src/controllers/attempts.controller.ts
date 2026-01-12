import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { sequelize } from "../config/sequelize.js";

import Attempt from "../models/Attempt.model.js";
import Answer from "../models/Answer.model.js";
import Question from "../models/Question.model.js";
import Result from "../models/Result.model.js";

import { INAPV_AREAS } from "../data/inapv-areas.js";
import { computeInapvScores } from "../services/scoring.service.js";
import { SaveAnswersBodySchema } from "../validators/attempts.schemas.js";
import Test from "../models/Test.model.js";
import Period from "../models/Period.model.js";

const ParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

const EXPECTED_ANSWER_COUNT = 103;

export async function getAttemptContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = ParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid attemptId" });
    }

    const { attemptId } = parsed.data;
    const { userId, organizationId } = req.auth!;

    const attempt = await Attempt.findByPk(attemptId, {
      attributes: [
        "id",
        "userId",
        "periodId",
        "testId",
        "status",
        "answeredCount",
        "finishedAt",
      ],
    });

    if (!attempt) {
      return res.status(404).json({ ok: false, error: "Attempt not found" });
    }

    // Ownership
    if (attempt.userId !== userId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    // Period + org scoping
    const period = await Period.findByPk(attempt.periodId, {
      attributes: [
        "id",
        "organizationId",
        "testId",
        "name",
        "status",
        "startAt",
        "endAt",
      ],
    });

    if (!period) {
      return res
        .status(500)
        .json({ ok: false, error: "Period missing for attempt" });
    }

    if (period.organizationId !== organizationId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    if (period.testId !== attempt.testId) {
      return res
        .status(500)
        .json({ ok: false, error: "Attempt/test mismatch with period" });
    }

    const test = await Test.findByPk(period.testId, {
      attributes: ["id", "key", "version", "name"],
    });

    if (!test) {
      return res
        .status(500)
        .json({ ok: false, error: "Test not configured for period" });
    }

    const questions = await Question.findAll({
      where: { testId: test.id },
      attributes: ["id", "externalId", "text", "area", "dim", "orderIndex"],
      order: [["orderIndex", "ASC"]],
    });

    return res.json({
      ok: true,
      test,
      period: {
        id: period.id,
        name: period.name,
        status: period.status,
        startAt: period.startAt,
        endAt: period.endAt,
      },
      attempt: {
        id: attempt.id,
        periodId: attempt.periodId,
        status: attempt.status,
        answeredCount: attempt.answeredCount,
        finishedAt: attempt.finishedAt,
      },
      areas: INAPV_AREAS,
      questions,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAttemptAnswers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsParsed = ParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid attemptId" });
    }

    const { attemptId } = paramsParsed.data;

    const attempt = await Attempt.findByPk(attemptId, {
      attributes: ["id", "userId", "status", "answeredCount", "testId"],
    });

    if (!attempt)
      return res.status(404).json({ ok: false, error: "Attempt not found" });

    if (attempt.userId !== req.auth!.userId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    // Devolvemos todas las respuestas de ese attempt (103 máx, liviano)
    const answers = await Answer.findAll({
      where: { attemptId: attempt.id },
      attributes: ["questionId", "value"],
      order: [["questionId", "ASC"]],
    });

    return res.json({
      ok: true,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        answeredCount: attempt.answeredCount,
        testId: attempt.testId,
      },
      answers: answers.map((a) => ({
        questionId: a.questionId,
        value: a.value,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function saveAttemptAnswers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsParsed = ParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid attemptId" });
    }

    const bodyParsed = SaveAnswersBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Invalid body",
        details: z.treeifyError(bodyParsed.error),
      });
    }

    const { attemptId } = paramsParsed.data;
    const { answers, answeredCount } = bodyParsed.data;

    // 1) Cargar attempt y validar ownership + estado
    const attempt = await Attempt.findByPk(attemptId);
    if (!attempt)
      return res.status(404).json({ ok: false, error: "Attempt not found" });

    if (attempt.userId !== req.auth!.userId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(409).json({ ok: false, error: "Attempt is finished" });
    }

    // 2) Validar que las preguntas pertenezcan al test del attempt (evita writes “raras”)
    const questionIds = answers.map((a) => a.questionId);
    const validCount = await Question.count({
      where: { id: questionIds, testId: attempt.testId },
    });
    if (validCount !== questionIds.length) {
      return res.status(400).json({
        ok: false,
        error: "Some questionIds are invalid for this test",
      });
    }

    // 3) Upsert en 1 batch
    await sequelize.transaction(async (t) => {
      await Answer.bulkCreate(
        answers.map((a) => ({
          attemptId: attempt.id,
          questionId: a.questionId,
          value: a.value,
        })),
        {
          transaction: t,
          updateOnDuplicate: ["value", "updatedAt"],
        }
      );

      // 4) Sin COUNT(*) por request: si el front manda answeredCount, lo usamos como cache
      if (typeof answeredCount === "number") {
        // solo avanza (no retrocede) para evitar inconsistencias
        const next = Math.max(attempt.answeredCount, answeredCount);
        if (next !== attempt.answeredCount) {
          attempt.answeredCount = next;
          await attempt.save({ transaction: t });
        }
      }
    });

    return res.json({
      ok: true,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        answeredCount: attempt.answeredCount, // puede ser 0 si el front no envía answeredCount aún
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function finishAttempt(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsParsed = ParamsSchema.safeParse(req.params);
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
        "periodId",
      ],
    });

    if (!attempt) {
      return res.status(404).json({ ok: false, error: "Attempt not found" });
    }

    // Ownership
    if (attempt.userId !== req.auth!.userId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    // (Opcional pero recomendado) org-scope vía Period
    // Si prefieres no hacerlo aquí, puedes quitar este bloque.
    const period = await Period.findByPk(attempt.periodId, {
      attributes: ["id", "organizationId"],
    });
    if (!period) {
      return res
        .status(500)
        .json({ ok: false, error: "Period missing for attempt" });
    }
    if (period.organizationId !== req.auth!.organizationId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    // ✅ Idempotencia: si ya está finished, devuelve el result existente con el MISMO shape que GET /attempts/:id/result
    if (attempt.status === "finished") {
      const existingResult = await Result.findOne({
        where: { attemptId: attempt.id },
        attributes: [
          "scoresByArea",
          "scoresByAreaDim",
          "topAreas",
          "createdAt",
        ],
      });

      if (existingResult) {
        return res.json({
          ok: true,
          status: "finished",
          attempt: {
            id: attempt.id,
            answeredCount: attempt.answeredCount,
            finishedAt: attempt.finishedAt,
          },
          result: {
            scoresByArea: existingResult.scoresByArea,
            scoresByAreaDim: existingResult.scoresByAreaDim,
            topAreas: existingResult.topAreas,
            createdAt: existingResult.createdAt,
          },
        });
      }
      // Si por alguna razón está finished pero no hay result, seguimos y lo recalculamos.
    } else if (attempt.status !== "in_progress") {
      return res
        .status(409)
        .json({ ok: false, error: "Attempt is not finishable" });
    }

    // Conteo real (1 vez)
    const answerCount = await Answer.count({
      where: { attemptId: attempt.id },
    });

    if (answerCount !== EXPECTED_ANSWER_COUNT) {
      return res.status(400).json({
        ok: false,
        error: "Attempt not complete",
        answeredCount: answerCount,
        expected: EXPECTED_ANSWER_COUNT,
      });
    }

    // Cargar respuestas (solo lo necesario)
    const answers = await Answer.findAll({
      where: { attemptId: attempt.id },
      attributes: ["questionId", "value"],
    });

    // Cargar preguntas de ese test para mapear area/dim (dim es string[])
    const questions = await Question.findAll({
      where: { testId: attempt.testId },
      attributes: ["id", "area", "dim"],
    });

    const questionsById = new Map<number, { area: string; dim: string[] }>();
    for (const q of questions) {
      questionsById.set(q.id, { area: q.area, dim: q.dim });
    }

    const computed = computeInapvScores({
      questionsById,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        value: a.value,
      })),
    });

    // Guardar Result + finalizar Attempt en transacción
    try {
      await sequelize.transaction(async (t) => {
        const [result, created] = await Result.findOrCreate({
          where: { attemptId: attempt.id },
          defaults: {
            attemptId: attempt.id,
            scoresByArea: computed.scoresByArea,
            scoresByAreaDim: computed.scoresByAreaDim,
            topAreas: computed.topAreas,
          },
          transaction: t,
        });

        if (!created) {
          result.scoresByArea = computed.scoresByArea;
          result.scoresByAreaDim = computed.scoresByAreaDim;
          result.topAreas = computed.topAreas;
          await result.save({ transaction: t });
        }

        attempt.status = "finished";
        attempt.finishedAt = attempt.finishedAt ?? new Date();
        attempt.answeredCount = answerCount;
        await attempt.save({ transaction: t });
      });
    } catch (error: any) {
      console.error("finishAttempt error:", error);
      console.error("finishAttempt error.parent:", error?.parent);
      console.error("finishAttempt error.original:", error?.original);
      return res.status(500).json({
        ok: false,
        error: error?.message || "finishAttempt failed",
        sqlMessage: error?.parent?.sqlMessage || error?.original?.sqlMessage,
        code: error?.parent?.code || error?.original?.code,
      });
    }

    // Para devolver createdAt real y un shape consistente, leemos el result persistido
    const savedResult = await Result.findOne({
      where: { attemptId: attempt.id },
      attributes: ["scoresByArea", "scoresByAreaDim", "topAreas", "createdAt"],
    });

    if (!savedResult) {
      return res
        .status(500)
        .json({ ok: false, error: "Result missing after finish" });
    }

    // Asegura que attempt tenga los valores finales (por si acaso)
    await attempt.reload({
      attributes: ["id", "status", "answeredCount", "finishedAt"],
    });

    return res.json({
      ok: true,
      status: "finished",
      attempt: {
        id: attempt.id,
        answeredCount: attempt.answeredCount,
        finishedAt: attempt.finishedAt,
      },
      result: {
        scoresByArea: savedResult.scoresByArea,
        scoresByAreaDim: savedResult.scoresByAreaDim,
        topAreas: savedResult.topAreas,
        createdAt: savedResult.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}
