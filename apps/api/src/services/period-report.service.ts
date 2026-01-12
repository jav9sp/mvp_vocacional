import Period from "../models/Period.model.js";
import Enrollment from "../models/Enrollment.model.js";
import Attempt from "../models/Attempt.model.js";
import Result from "../models/Result.model.js";
import { areaName } from "../utils/inapv-areas.js";

function getCourse(meta: any): string {
  if (!meta) return "Sin curso";
  return (
    meta.course || meta.curso || meta.classroom || meta.grade || "Sin curso"
  );
}

export type PeriodReport = {
  period: { id: number; name: string; status: string; testId: number };
  totals: {
    enrolled: number;
    notStarted: number;
    inProgress: number;
    finished: number;
    completionRate: number;
  };
  byCourse: Record<
    string,
    {
      enrolled: number;
      notStarted: number;
      inProgress: number;
      finished: number;
    }
  >;
  topAreas: {
    distribution: Record<string, number>;
    top5: Array<{ area: string; count: number }>;
  };
};

export async function buildPeriodReport(
  periodId: number
): Promise<PeriodReport> {
  const period = await Period.findByPk(periodId);
  if (!period) throw new Error("Period not found");

  const enrollments = await Enrollment.findAll({
    where: { periodId },
    order: [["createdAt", "ASC"]],
  });
  const studentIds = enrollments.map((e) => e.studentUserId);

  const attempts = studentIds.length
    ? await Attempt.findAll({
        where: { userId: studentIds, testId: period.testId },
        attributes: [
          "id",
          "userId",
          "status",
          "answeredCount",
          "finishedAt",
          "createdAt",
        ],
        order: [["createdAt", "DESC"]],
      })
    : [];

  const latestAttemptByUserId = new Map<number, any>();
  for (const a of attempts) {
    if (!latestAttemptByUserId.has(a.userId))
      latestAttemptByUserId.set(a.userId, a);
  }

  const attemptIds = Array.from(latestAttemptByUserId.values()).map(
    (a) => a.id
  );

  const results = attemptIds.length
    ? await Result.findAll({
        where: { attemptId: attemptIds },
        attributes: ["attemptId", "topAreas"],
      })
    : [];

  const resultByAttemptId = new Map(results.map((r: any) => [r.attemptId, r]));

  const totals = {
    enrolled: enrollments.length,
    notStarted: 0,
    inProgress: 0,
    finished: 0,
  };

  const byCourse: Record<
    string,
    {
      enrolled: number;
      notStarted: number;
      inProgress: number;
      finished: number;
    }
  > = {};

  const topAreasCountPretty: Record<string, number> = {};

  for (const enr of enrollments) {
    const course = getCourse(enr.meta);
    if (!byCourse[course])
      byCourse[course] = {
        enrolled: 0,
        notStarted: 0,
        inProgress: 0,
        finished: 0,
      };
    byCourse[course].enrolled++;

    const attempt = latestAttemptByUserId.get(enr.studentUserId);

    if (!attempt) {
      totals.notStarted++;
      byCourse[course].notStarted++;
      continue;
    }
    if (attempt.status === "in_progress") {
      totals.inProgress++;
      byCourse[course].inProgress++;
      continue;
    }
    if (attempt.status === "finished") {
      totals.finished++;
      byCourse[course].finished++;

      const result = resultByAttemptId.get(attempt.id);
      const topAreas = result?.topAreas || [];
      if (topAreas[0]) {
        const pretty = areaName(topAreas[0]);
        topAreasCountPretty[pretty] = (topAreasCountPretty[pretty] || 0) + 1;
      }
    }
  }

  const completionRate =
    totals.enrolled === 0
      ? 0
      : Math.round((totals.finished / totals.enrolled) * 1000) / 10;

  const top5 = Object.entries(topAreasCountPretty)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      testId: period.testId,
    },
    totals: { ...totals, completionRate },
    byCourse,
    topAreas: { distribution: topAreasCountPretty, top5 },
  };
}
