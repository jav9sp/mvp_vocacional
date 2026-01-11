import { Request, Response } from "express";
import { Op } from "sequelize";
import Period from "../models/Period.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import Attempt from "../models/Attempt.model.ts";
import User from "../models/User.model.ts";

export async function getPeriodSummary(req: Request, res: Response) {
  const periodId = Number(req.params.periodId);
  if (!Number.isFinite(periodId)) {
    return res.status(400).json({ ok: false, error: "Invalid periodId" });
  }

  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const period = await Period.findByPk(periodId);
  if (!period)
    return res.status(404).json({ ok: false, error: "Period not found" });
  if (period.organizationId !== orgId) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  // enrolled students
  const studentsCount = await Enrollment.count({ where: { periodId } });

  // started = attempts in this period (1 attempt per user per period)
  const startedCount = await Attempt.count({ where: { periodId } });

  // finished = attempts finished
  const finishedCount = await Attempt.count({
    where: { periodId, status: "finished" },
  });

  const notStartedCount = Math.max(studentsCount - startedCount, 0);
  const completionPct =
    studentsCount === 0 ? 0 : Math.round((finishedCount / studentsCount) * 100);

  return res.json({
    ok: true,
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      startAt: period.startAt,
      endAt: period.endAt,
      testId: period.testId,
      createdAt: period.createdAt,
    },
    counts: {
      studentsCount,
      startedCount,
      finishedCount,
      notStartedCount,
      completionPct,
    },
  });
}

function normalizeStatus(attempt: Attempt | undefined) {
  if (!attempt) return "not_started";
  if (attempt.status === "finished") return "finished";
  return "in_progress";
}

export async function getPeriodStudents(req: any, res: any) {
  const periodId = Number(req.params.periodId);
  if (!Number.isFinite(periodId)) {
    return res.status(400).json({ ok: false, error: "Invalid periodId" });
  }

  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const period = await Period.findByPk(periodId);
  if (!period)
    return res.status(404).json({ ok: false, error: "Period not found" });
  if (period.organizationId !== orgId) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const statusFilter = (req.query.status as string | undefined) ?? undefined;
  const q = ((req.query.q as string | undefined) ?? "").trim();

  const page = Math.max(Number(req.query.page ?? 1), 1);
  const pageSizeRaw = Number(req.query.pageSize ?? 25);
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 200);
  const offset = (page - 1) * pageSize;

  // filtro de búsqueda sobre User (rut/name/email)
  const userWhere: any = {};
  if (q) {
    userWhere[Op.or] = [
      { rut: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
    ];
  }

  const courseFilter = (req.query.course as string | undefined)?.trim();

  // Enrollments paginados
  const { rows: enrollments, count: total } = await Enrollment.findAndCountAll({
    where: {
      periodId,
      ...(courseFilter ? { meta: { course: courseFilter } } : {}),
    },
    include: [
      {
        model: User,
        as: "student", // 👈 si no tienes alias/association, quítalo y usa include: [User]
        required: true,
        attributes: ["id", "rut", "name", "email"],
        where: userWhere,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset,
  });

  // Si no tienes associations definidas en Enrollment -> User,
  // lo anterior te fallará. En ese caso, dime y te paso la variante "manual" (2 queries sin include).

  const studentUserIds = enrollments.map((e: any) => e.studentUserId);

  const attempts = studentUserIds.length
    ? await Attempt.findAll({
        where: { periodId, userId: { [Op.in]: studentUserIds } },
        attributes: [
          "id",
          "userId",
          "status",
          "answeredCount",
          "finishedAt",
          "createdAt",
        ],
      })
    : [];

  const attemptByUserId = new Map<number, any>();
  for (const a of attempts as any[]) attemptByUserId.set(a.userId, a);

  const rows = enrollments.map((e: any) => {
    const u = e.student ?? e.user ?? e.User; // por si cambia cómo viene el include
    const a = attemptByUserId.get(e.studentUserId);

    const derivedStatus = normalizeStatus(a);

    return {
      enrollmentId: e.id,
      student: {
        id: u.id,
        rut: u.rut,
        name: u.name,
        email: u.email,
      },
      status: derivedStatus,
      attempt: a
        ? {
            id: a.id,
            status: a.status,
            answeredCount: a.answeredCount,
            finishedAt: a.finishedAt,
            createdAt: a.createdAt,
          }
        : null,
    };
  });

  // Filtro status post-merge (porque status depende de attempt)
  const filteredRows =
    statusFilter &&
    ["not_started", "in_progress", "finished"].includes(statusFilter)
      ? rows.filter((r: any) => r.status === statusFilter)
      : rows;

  // extraer cursos únicos desde enrollments
  const coursesSet = new Set<string>();

  for (const e of enrollments as any[]) {
    const meta = e.meta as any;
    if (meta?.course) {
      coursesSet.add(meta.course);
    }
  }

  const courses = Array.from(coursesSet).sort();

  return res.json({
    ok: true,
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      testId: period.testId,
    },
    page,
    pageSize,
    total,
    courses,
    rows: filteredRows,
  });
}
