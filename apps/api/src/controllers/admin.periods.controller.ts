import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import Period from "../models/Period.model.js";
import Test from "../models/Test.model.js";
import Organization from "../models/Organization.model.js";
import Attempt from "../models/Attempt.model.ts";
import Enrollment from "../models/Enrollment.model.ts";

export async function adminListPeriods(req: Request, res: Response) {
  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const org = await Organization.findOne({
    where: { id: orgId },
  });
  if (!org)
    return res.status(500).json({ ok: false, error: "No organization found" });

  const periods = await Period.findAll({
    where: { organizationId: org.id },
    order: [["createdAt", "DESC"]],
  });

  const periodIds = periods.map((p) => p.id);

  const enrollAgg = await Enrollment.findAll({
    where: { periodId: { [Op.in]: periodIds } },
    attributes: ["periodId", [fn("COUNT", col("periodId")), "studentsCount"]],
    group: ["periodId"],
    raw: true,
  });

  const finishedAgg = await Attempt.findAll({
    where: { periodId: { [Op.in]: periodIds }, status: "finished" },
    attributes: [
      "periodId",
      [fn("COUNT", literal("DISTINCT userId")), "finishedCount"],
    ],
    group: ["periodId"],
    raw: true,
  });

  const studentsByPeriod = new Map<number, number>();
  for (const r of enrollAgg as any[]) {
    studentsByPeriod.set(Number(r.periodId), Number(r.studentsCount));
  }

  const finishedByPeriod = new Map<number, number>();
  for (const r of finishedAgg as any[]) {
    finishedByPeriod.set(Number(r.periodId), Number(r.finishedCount));
  }

  // opcional: traer nombre del test
  const testIds = Array.from(new Set(periods.map((p) => p.testId)));
  const tests = await Test.findAll({
    where: { id: testIds },
    attributes: ["id", "key", "version", "name"],
  });
  const testById = new Map(tests.map((t) => [t.id, t]));

  return res.json({
    ok: true,
    organization: { id: org.id, name: org.name },
    periods: periods.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      startAt: p.startAt,
      endAt: p.endAt,
      test: testById.get(p.testId) || { id: p.testId },
      createdAt: p.createdAt,
      studentsCount: studentsByPeriod.get(p.id) ?? 0,
      finishedCount: finishedByPeriod.get(p.id) ?? 0,
    })),
  });
}
