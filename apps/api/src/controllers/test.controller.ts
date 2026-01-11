import { Request, Response } from "express";
import Question from "../models/Question.model.ts";
import Period from "../models/Period.model.ts";
import {
  getActiveEnrollment,
  getTestById,
  getOrCreateActiveAttempt,
} from "../services/attempt.service.ts";

import { INAPV_AREAS } from "../data/inapv-areas.js";

export async function getCurrentTest(req: Request, res: Response) {
  try {
    const { userId, organizationId } = req.auth!;

    const enrollment = await getActiveEnrollment(userId, organizationId);
    const period = await Period.findByPk(enrollment.periodId);
    if (!period || period.status !== "active") {
      return res
        .status(403)
        .json({ ok: false, error: "No active period for this student" });
    }

    const test = await getTestById(period.testId);
    const attempt = await getOrCreateActiveAttempt(
      userId,
      period.id,
      period.testId
    );

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
      period: {
        id: period.id,
        name: period.name,
        status: period.status,
        startAt: period.startAt,
        endAt: period.endAt,
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
