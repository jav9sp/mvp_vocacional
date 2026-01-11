import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import Enrollment from "../models/Enrollment.model.ts";
import Period from "../models/Period.model.ts";
import Test from "../models/Test.model.ts";
import Attempt from "../models/Attempt.model.ts";
import { getOrCreateActiveAttempt } from "../services/attempt.service.ts";

const EnrollmentIdParamsSchema = z.object({
  enrollmentId: z.coerce.number().int().positive(),
});

export async function listMyActiveEnrollments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, organizationId } = req.auth!;

    const enrollments = await Enrollment.findAll({
      where: { studentUserId: userId, status: "active" },
      attributes: ["id", "periodId", "status", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    if (enrollments.length === 0) {
      return res.json({ ok: true, items: [] });
    }

    const periodsIds = [...new Set(enrollments.map((e) => e.periodId))];

    const periods = await Period.findAll({
      where: { id: periodsIds, organizationId },
      attributes: ["id", "name", "status", "startAt", "endAt", "testId"],
    });

    const periodById = new Map(periods.map((p) => [p.id, p]));
    const visibleEnrollments = enrollments.filter((e) =>
      periodById.has(e.periodId)
    );

    if (visibleEnrollments.length === 0) {
      return res.json({ ok: true, items: [] });
    }

    const visiblePeriodIds = [
      ...new Set(visibleEnrollments.map((e) => e.periodId)),
    ];
    const testIds = [...new Set(periods.map((p) => p.testId))];

    const tests = await Test.findAll({
      where: { id: testIds },
      attributes: ["id", "key", "version", "name"],
    });
    const testById = new Map(tests.map((t) => [t.id, t]));

    const attempts = await Attempt.findAll({
      where: { userId, periodId: { [Op.in]: visiblePeriodIds } },
      attributes: [
        "id",
        "periodId",
        "status",
        "answeredCount",
        "finishedAt",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    const attemptByPeriodId = new Map<number, Attempt>();
    for (const a of attempts) {
      const existing = attemptByPeriodId.get(a.periodId);
      if (!existing) {
        attemptByPeriodId.set(a.periodId, a);
        continue;
      }
      // prioriza in_progress sobre finished
      if (existing.status !== "in_progress" && a.status === "in_progress") {
        attemptByPeriodId.set(a.periodId, a);
      }
    }

    const items = visibleEnrollments.map((e) => {
      const period = periodById.get(e.periodId)!;
      const test = testById.get(period.testId) || null;
      const attempt = attemptByPeriodId.get(period.id) || null;

      return {
        enrollmentId: e.id,
        status: e.status,
        period: {
          id: period.id,
          name: period.name,
          status: period.status,
          startAt: period.startAt,
          endAt: period.endAt,
        },
        test: test
          ? {
              id: test.id,
              key: test.key,
              version: test.version,
              name: test.name,
            }
          : null,
        attempt: attempt
          ? {
              id: attempt.id,
              status: attempt.status,
              answeredCount: attempt.answeredCount,
              finishedAt: attempt.finishedAt,
            }
          : null,
      };
    });

    return res.json({ ok: true, items });
  } catch (error) {
    return next(error);
  }
}

export async function getOrCreateAttemptForEnrollment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = EnrollmentIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Invalid enrollmentId" });
    }

    const { enrollmentId } = parsed.data;
    const { userId, organizationId } = req.auth!;

    // Enrollment debe ser del estudiante
    const enrollment = await Enrollment.findOne({
      where: { id: enrollmentId, studentUserId: userId, status: "active" },
      attributes: ["id", "periodId", "status"],
    });

    if (!enrollment) {
      return res.status(404).json({ ok: false, error: "Enrollment not found" });
    }

    // Period debe ser activo y de la misma org
    const period = await Period.findByPk(enrollment.periodId, {
      attributes: [
        "id",
        "name",
        "status",
        "startAt",
        "endAt",
        "testId",
        "organizationId",
      ],
    });

    if (!period || period.status !== "active") {
      return res
        .status(403)
        .json({ ok: false, error: "No active period for this enrollment" });
    }

    if (period.organizationId !== organizationId) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const attempt = await getOrCreateActiveAttempt(
      userId,
      period.id,
      period.testId
    );

    return res.json({
      ok: true,
      enrollment: {
        id: enrollment.id,
        periodId: enrollment.periodId,
        status: enrollment.status,
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
        periodId: attempt.periodId,
        status: attempt.status,
        answeredCount: attempt.answeredCount,
        finishedAt: attempt.finishedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}
