import { z } from "zod";
import Attempt from "../models/Attempt.model.js";
import Answer from "../models/Answer.model.js";
import Question from "../models/Question.model.js";
import Result from "../models/Result.model.js";
import { db } from "../config/sequelize.js";
import { computeInapvScores } from "../services/scoring.service.ts";
import { SaveAnswersBodySchema } from "../validators/attempts.schemas.ts";

const AttemptIdParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

const EXPECTED_ANSWER_COUNT = 103;

export async function saveAttemptAnswers(req: any, res: any) {
  const paramsParsed = AttemptIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid attemptId" });
  }

  const bodyParsed = SaveAnswersBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid body",
      //   TODO: Verificar este uso deprecated
      details: bodyParsed.error.flatten(),
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
    return res
      .status(400)
      .json({ ok: false, error: "Some questionIds are invalid for this test" });
  }

  // 3) Upsert en 1 batch
  await db.transaction(async (t) => {
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
}

export async function finishAttempt(req: any, res: any) {
  const paramsParsed = AttemptIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid attemptId" });
  }
  const { attemptId } = paramsParsed.data;

  const attempt = await Attempt.findByPk(attemptId);
  if (!attempt)
    return res.status(404).json({ ok: false, error: "Attempt not found" });

  if (attempt.userId !== req.auth!.userId) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (attempt.status !== "in_progress") {
    return res.status(409).json({ ok: false, error: "Attempt is finished" });
  }

  // Conteo real (1 vez)
  const answerCount = await Answer.count({ where: { attemptId: attempt.id } });
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

  // Cargar preguntas de ese test para mapear area/dim
  const questions = await Question.findAll({
    where: { testId: attempt.testId },
    attributes: ["id", "area", "dim"],
  });

  const questionsById = new Map<number, { area: string; dim: string[] }>();
  for (const q of questions) {
    questionsById.set(q.id, {
      area: q.area,
      dim: Array.isArray(q.dim) ? q.dim : [q.dim],
    });
  }

  const computed = computeInapvScores({
    questionsById,
    answers: answers.map((a) => ({ questionId: a.questionId, value: a.value })),
  });

  // Guardar result + cerrar attempt (todo en transacción)
  await db.transaction(async (t) => {
    await Result.create(
      {
        attemptId: attempt.id,
        scoresByArea: computed.scoresByArea,
        scoresByAreaDim: computed.scoresByAreaDim,
        topAreas: computed.topAreas,
      },
      { transaction: t }
    );

    attempt.status = "finished";
    attempt.finishedAt = new Date();
    attempt.answeredCount = answerCount; // ahora sí, real
    await attempt.save({ transaction: t });
  });

  return res.json({
    ok: true,
    result: computed,
  });
}
