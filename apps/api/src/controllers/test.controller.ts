import Question from "../models/Question.model.ts";
import {
  getActiveTest,
  getOrCreateActiveAttempt,
} from "../services/attempt.service.ts";
import { INAPV_AREAS } from "../data/inapv-areas.js"; // te indico abajo cómo hacerlo

export async function getCurrentTest(req: any, res: any) {
  const userId = req.auth!.userId;

  const test = await getActiveTest();
  const attempt = await getOrCreateActiveAttempt(userId);

  const questions = await Question.findAll({
    where: { testId: test.id },
    attributes: ["id", "externalId", "text", "area", "dim", "orderIndex"],
    order: [["orderIndex", "ASC"]],
  });

  return res.json({
    ok: true,
    test: {
      id: test.id,
      key: test.key,
      version: test.version,
      name: test.name,
    },
    attempt: {
      id: attempt.id,
      status: attempt.status,
      answeredCount: attempt.answeredCount,
    },
    areas: INAPV_AREAS,
    questions,
  });
}
