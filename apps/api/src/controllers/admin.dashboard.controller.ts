import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import Period from "../models/Period.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import Attempt from "../models/Attempt.model.ts";

export async function adminGetDashboard(req: Request, res: Response) {
  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const periods = await Period.findAll({
    where: { organizationId: orgId },
    attributes: ["id", "name", "status", "startAt", "endAt", "createdAt"],
    order: [
      [
        // prioridad de estados
        literal(`
      CASE status
        WHEN 'active' THEN 1
        WHEN 'draft' THEN 2
        WHEN 'closed' THEN 3
        ELSE 4
      END
    `),
        "ASC",
      ],
      ["createdAt", "DESC"],
    ],
  });

  const periodIds = periods.map((p) => p.id);

  const enrollAgg = periodIds.length
    ? await Enrollment.findAll({
        where: { periodId: { [Op.in]: periodIds } },
        attributes: [
          "periodId",
          [fn("COUNT", col("periodId")), "studentsCount"],
        ],
        group: ["periodId"],
        raw: true,
      })
    : [];

  const finishedAgg = periodIds.length
    ? await Attempt.findAll({
        where: { periodId: { [Op.in]: periodIds }, status: "finished" },
        attributes: [
          "periodId",
          [fn("COUNT", literal("DISTINCT userId")), "finishedCount"],
        ],
        group: ["periodId"],
        raw: true,
      })
    : [];

  const studentsByPeriod = new Map<number, number>();
  for (const r of enrollAgg as any[]) {
    studentsByPeriod.set(Number(r.periodId), Number(r.studentsCount));
  }

  const finishedByPeriod = new Map<number, number>();
  for (const r of finishedAgg as any[]) {
    finishedByPeriod.set(Number(r.periodId), Number(r.finishedCount));
  }

  const periodRows = periods.map((p) => {
    const studentsCount = studentsByPeriod.get(p.id) ?? 0;
    const finishedCount = finishedByPeriod.get(p.id) ?? 0;
    const pct = studentsCount
      ? Math.round((finishedCount / studentsCount) * 100)
      : 0;

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      startAt: p.startAt,
      endAt: p.endAt,
      createdAt: p.createdAt,
      studentsCount,
      finishedCount,
      completionPct: pct,
    };
  });

  const totalPeriods = periods.length;
  const activePeriods = periods.filter((p) => p.status === "active").length;

  const totalStudents = periodRows.reduce((acc, r) => acc + r.studentsCount, 0);
  const totalFinished = periodRows.reduce((acc, r) => acc + r.finishedCount, 0);

  return res.json({
    ok: true,
    kpis: {
      totalPeriods,
      activePeriods,
      totalStudents,
      totalFinished,
    },
    periods: periodRows,
  });
}
