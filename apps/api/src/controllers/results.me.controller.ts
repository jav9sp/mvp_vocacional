import { Request, Response } from "express";
import Attempt from "../models/Attempt.model.js";
import Result from "../models/Result.model.js";
import Test from "../models/Test.model.js";

export async function getMyLatestResult(req: Request, res: Response) {
  const userId = req.auth!.userId;

  const activeTest = await Test.findOne({ where: { isActive: true } });
  if (!activeTest)
    return res.status(500).json({ ok: false, error: "No active test" });

  const attempt = await Attempt.findOne({
    where: { userId, testId: activeTest.id },
    order: [["createdAt", "DESC"]],
    attributes: ["id", "status", "answeredCount", "finishedAt"],
  });

  if (!attempt) {
    return res.json({
      ok: true,
      status: "not_started",
      attempt: null,
      result: null,
    });
  }

  if (attempt.status !== "finished") {
    return res.json({
      ok: true,
      status: attempt.status,
      attempt: { id: attempt.id, answeredCount: attempt.answeredCount },
      result: null,
    });
  }

  const result = await Result.findOne({
    where: { attemptId: attempt.id },
    attributes: ["scoresByArea", "scoresByAreaDim", "topAreas", "createdAt"],
  });

  if (!result)
    return res.status(500).json({ ok: false, error: "Result missing" });

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
}
