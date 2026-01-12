import Attempt from "../models/Attempt.model.js";
import Result from "../models/Result.model.js";

const RESULT_ATTRS = [
  "scoresByArea",
  "scoresByAreaDim",
  "topAreas",
  "createdAt",
] as const;

const ATTEMPT_ATTRS_STUDENT = [
  "id",
  "status",
  "answeredCount",
  "finishedAt",
  "userId",
  "testId",
  "periodId",
] as const;

export async function findResultByAttemptId(attemptId: number) {
  return Result.findOne({
    where: { attemptId },
    attributes: RESULT_ATTRS as any,
  });
}

export function serializeResult(result: any) {
  return {
    scoresByArea: result.scoresByArea,
    scoresByAreaDim: result.scoresByAreaDim,
    topAreas: result.topAreas,
    createdAt: result.createdAt,
  };
}

export function serializeStudentAttempt(attempt: Attempt) {
  return {
    id: attempt.id,
    answeredCount: attempt.answeredCount,
    finishedAt: attempt.finishedAt ?? null,
  };
}

export function serializeAdminAttempt(attempt: Attempt) {
  return {
    id: attempt.id,
    status: attempt.status,
    answeredCount: attempt.answeredCount,
    finishedAt: attempt.finishedAt ?? null,
    userId: attempt.userId,
    testId: attempt.testId,
    periodId: attempt.periodId,
  };
}
