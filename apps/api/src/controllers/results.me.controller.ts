import { NextFunction, Request, Response } from "express";
import Attempt from "../models/Attempt.model.ts";
import Result from "../models/Result.model.ts";
import Test from "../models/Test.model.ts";
import Period from "../models/Period.model.ts";

export async function getMyLatestResult(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { userId, organizationId } = req.auth!;
  try {
    const activeTest = await Test.findOne({ where: { isActive: true } });
    if (!activeTest)
      return res.status(500).json({ ok: false, error: "No active test" });

    const period = await Period.findOne({
      where: { organizationId, status: "active" },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "testId", "status"],
    });
    if (!period)
      res.status(404).json({
        ok: true,
        status: "no_active_period",
        attempt: null,
        result: null,
      });

    const attempt = await Attempt.findOne({
      where: { userId, periodId: period.id },
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
  } catch (error) {
    return next(error);
  }
}
