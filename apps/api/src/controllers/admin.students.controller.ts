import { Request, Response } from "express";
import { Op } from "sequelize";
import User from "../models/User.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import Period from "../models/Period.model.ts";
import Attempt from "../models/Attempt.model.ts";

export async function adminGetStudentDetail(req: Request, res: Response) {
  const studentId = Number(req.params.studentId);
  if (!Number.isFinite(studentId)) {
    return res.status(400).json({ ok: false, error: "Invalid studentId" });
  }

  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  // 1) estudiante
  const student = await User.findByPk(studentId, {
    attributes: ["id", "rut", "name", "email", "role", "createdAt"],
  });

  if (!student || student.role !== "student") {
    return res.status(404).json({ ok: false, error: "Student not found" });
  }

  // 2) enrollments del estudiante con Period (filtrando por org)
  const enrollments = await Enrollment.findAll({
    where: { studentUserId: student.id },
    include: [
      {
        model: Period,
        required: true,
        attributes: [
          "id",
          "name",
          "status",
          "startAt",
          "endAt",
          "testId",
          "organizationId",
          "createdAt",
        ],
        where: { organizationId: orgId },
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Si no hay enrollments en tu org, igual devolvemos el estudiante (para admin)
  const periodIds = enrollments.map((e: any) => e.periodId);

  // 3) attempts del estudiante en esos periodos
  const attempts = periodIds.length
    ? await Attempt.findAll({
        where: { userId: student.id, periodId: { [Op.in]: periodIds } },
        attributes: [
          "id",
          "periodId",
          "status",
          "answeredCount",
          "createdAt",
          "finishedAt",
          "testId",
        ],
        order: [["createdAt", "DESC"]],
      })
    : [];

  const attemptByPeriodId = new Map<number, any>();
  for (const a of attempts as any[]) {
    // si hubiera más de uno (no debería), nos quedamos con el más nuevo
    if (!attemptByPeriodId.has(a.periodId))
      attemptByPeriodId.set(a.periodId, a);
  }

  // status derivado por periodo (igual que tu lista)
  function deriveStatus(attempt: any | null) {
    if (!attempt) return "not_started" as const;
    if (attempt.status === "finished") return "finished" as const;
    return "in_progress" as const;
  }

  const rows = enrollments.map((e: any) => {
    const p = e.Period ?? e.period ?? e.periodo; // defensivo
    const a = attemptByPeriodId.get(e.periodId) ?? null;

    return {
      enrollmentId: e.id,
      enrollmentStatus: e.status,
      meta: e.meta ?? null,
      period: {
        id: p.id,
        name: p.name,
        status: p.status,
        startAt: p.startAt,
        endAt: p.endAt,
        testId: p.testId,
        createdAt: p.createdAt,
      },
      status: deriveStatus(a),
      attempt: a
        ? {
            id: a.id,
            status: a.status,
            answeredCount: a.answeredCount,
            createdAt: a.createdAt,
            finishedAt: a.finishedAt,
            testId: a.testId,
          }
        : null,
    };
  });

  // resumen rápido
  const summary = {
    totalPeriods: rows.length,
    finished: rows.filter((r: any) => r.status === "finished").length,
    inProgress: rows.filter((r: any) => r.status === "in_progress").length,
    notStarted: rows.filter((r: any) => r.status === "not_started").length,
  };

  return res.json({
    ok: true,
    student,
    summary,
    rows,
  });
}
