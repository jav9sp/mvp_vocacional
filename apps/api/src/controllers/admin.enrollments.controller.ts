import { Request, Response } from "express";
import { z } from "zod";
import Enrollment from "../models/Enrollment.model.ts";
import Period from "../models/Period.model.ts";
import User from "../models/User.model.ts";
import Attempt from "../models/Attempt.model.ts";
import Result from "../models/Result.model.ts";

const ParamsSchema = z.object({
  periodId: z.coerce.number().int().positive(),
});

export async function adminListEnrollments(req: Request, res: Response) {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid periodId" });

  const { periodId } = parsed.data;

  // Asegura que el periodo exista
  const period = await Period.findByPk(periodId);
  if (!period)
    return res.status(404).json({ ok: false, error: "Period not found" });

  // MVP single-org: no filtramos por org. Luego: validar req.adminOrgId === period.organizationId
  const enrollments = await Enrollment.findAll({
    where: { periodId },
    order: [["createdAt", "ASC"]],
  });

  const studentIds = enrollments.map((e) => e.studentUserId);

  const students = await User.findAll({
    where: { id: studentIds },
    attributes: ["id", "name", "email", "role"],
  });
  const studentById = new Map(students.map((s) => [s.id, s]));

  // OJO: como aún no migramos Attempt->enrollmentId, aquí intentamos inferir:
  // - busco el attempt más reciente del student para el test del periodo (p.testId)
  // Esto lo arreglamos definitivamente cuando cambiemos Attempt a enrollmentId.
  const attempts = await Attempt.findAll({
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
  });

  // Map: userId -> latest attempt
  const latestAttemptByUserId = new Map<number, Attempt>();
  for (const a of attempts) {
    if (!latestAttemptByUserId.has(a.userId))
      latestAttemptByUserId.set(a.userId, a);
  }

  // Buscar results para esos attempts
  const attemptIds = Array.from(latestAttemptByUserId.values()).map(
    (a) => a.id
  );
  const results = attemptIds.length
    ? await Result.findAll({
        where: { attemptId: attemptIds },
        attributes: ["attemptId", "topAreas", "createdAt"],
      })
    : [];
  const resultByAttemptId = new Map(results.map((r) => [r.attemptId, r]));

  const rows = enrollments.map((enr) => {
    const student = studentById.get(enr.studentUserId);
    const attempt = latestAttemptByUserId.get(enr.studentUserId);
    const result = attempt ? resultByAttemptId.get(attempt.id) : null;

    // estado para UI
    let progressStatus: "not_started" | "in_progress" | "finished" =
      "not_started";
    if (attempt?.status === "in_progress") progressStatus = "in_progress";
    if (attempt?.status === "finished") progressStatus = "finished";

    return {
      enrollment: {
        id: enr.id,
        status: enr.status,
        meta: enr.meta,
        createdAt: enr.createdAt,
      },
      student: student
        ? { id: student.id, name: student.name, email: student.email }
        : { id: enr.studentUserId, name: "(missing user)", email: null },
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            answeredCount: attempt.answeredCount,
            finishedAt: attempt.finishedAt,
          }
        : null,
      result: result
        ? { topAreas: result.topAreas, createdAt: result.createdAt }
        : null,
      progressStatus,
    };
  });

  return res.json({
    ok: true,
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      testId: period.testId,
    },
    enrollments: rows,
  });
}
