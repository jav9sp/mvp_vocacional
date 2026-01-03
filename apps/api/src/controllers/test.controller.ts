import { Request, Response } from "express";
import Question from "../models/Question.model.ts";
import {
  getActiveEnrollment,
  getActiveTest,
  getOrCreateActiveAttempt,
} from "../services/attempt.service.ts";
import { INAPV_AREAS } from "../data/inapv-areas.js";

export async function getCurrentTest(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;

    const test = await getActiveTest();
    const enrollment = await getActiveEnrollment(userId);
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
        periodId: enrollment.periodId,
        status: attempt.status,
        answeredCount: attempt.answeredCount,
      },
      areas: INAPV_AREAS,
      questions,
    });
  } catch (e: any) {
    const msg = e?.message || "Error";
    if (msg.includes("No active enrollment")) {
      return res.status(403).json({ ok: false, error: msg });
    }
    return res.status(500).json({ ok: false, error: msg });
  }
}
