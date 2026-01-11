import { NextFunction, Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import User from "../models/User.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import Period from "../models/Period.model.ts";
import Attempt from "../models/Attempt.model.ts";

type DerivedStatus = "not_started" | "in_progress" | "finished";

function normalizeStatusFromAttempt(a?: any | null): DerivedStatus {
  if (!a) return "not_started";
  if (a.status === "finished") return "finished";
  return "in_progress";
}

function deriveStatus(
  attempt: any | null
): "not_started" | "in_progress" | "finished" {
  if (!attempt) return "not_started";
  return attempt.status === "finished" ? "finished" : "in_progress";
}

function getCourseFromMeta(meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  const c = String((meta as any).course ?? "").trim();
  return c ? c : null;
}

export async function adminListStudents(req: Request, res: Response) {
  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const q = String(req.query.q ?? "").trim();
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 25), 1), 200);
  const offset = (page - 1) * pageSize;

  const where: any = { role: "student", organizationId: orgId };
  if (q) {
    where[Op.or] = [
      { rut: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows: students, count: total } = await User.findAndCountAll({
    where,
    attributes: ["id", "rut", "name", "email", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset,
  });

  const studentIds = students.map((s: any) => s.id);

  // Enrollments activos (contar por estudiante) dentro de periodos de la org
  const activeEnrollAgg = studentIds.length
    ? await Enrollment.findAll({
        where: { studentUserId: { [Op.in]: studentIds }, status: "active" },
        include: [
          {
            model: Period,
            as: "period",
            required: true,
            where: { organizationId: orgId },
            attributes: [],
          },
        ],
        attributes: [
          "studentUserId",
          [fn("COUNT", col("Enrollment.id")), "cnt"],
        ],
        group: ["studentUserId"],
        raw: true,
      })
    : [];

  const activeByStudent = new Map<number, number>();
  for (const r of activeEnrollAgg as any[]) {
    activeByStudent.set(Number(r.studentUserId), Number(r.cnt));
  }

  // Attempts finalizados (distinct por periodo) por estudiante
  const finishedAgg = studentIds.length
    ? await Attempt.findAll({
        where: { userId: { [Op.in]: studentIds }, status: "finished" },
        attributes: [
          "userId",
          [fn("COUNT", literal("DISTINCT periodId")), "cnt"],
        ],
        group: ["userId"],
        raw: true,
      })
    : [];

  const finishedByStudent = new Map<number, number>();
  for (const r of finishedAgg as any[]) {
    finishedByStudent.set(Number(r.userId), Number(r.cnt));
  }

  return res.json({
    ok: true,
    page,
    pageSize,
    total,
    rows: students.map((s: any) => ({
      id: s.id,
      rut: s.rut,
      name: s.name,
      email: s.email,
      createdAt: s.createdAt,
      activeEnrollmentsCount: activeByStudent.get(s.id) ?? 0,
      finishedPeriodsCount: finishedByStudent.get(s.id) ?? 0,
    })),
  });
}

export async function adminGetStudents(req: Request, res: Response) {
  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const q = String(req.query.q ?? "").trim();
  const course = String(req.query.course ?? "").trim(); // <- filtro curso
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const pageSizeRaw = Number(req.query.pageSize ?? 25);
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 200);
  const offset = (page - 1) * pageSize;

  // 1) Periodos de la org (scope)
  const periods = await Period.findAll({
    where: { organizationId: orgId },
    attributes: ["id"],
    raw: true,
  });
  const periodIds = periods.map((p: any) => Number(p.id));

  // 2) Estudiantes (paginado + q)
  const whereUser: any = { role: "student", organizationId: orgId };
  if (q) {
    whereUser[Op.or] = [
      { rut: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows: students, count: total } = await User.findAndCountAll({
    where: whereUser,
    attributes: ["id", "rut", "name", "email"],
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset,
  });

  const studentIds = students.map((s) => s.id);

  // Si no hay periodos o no hay estudiantes en la página:
  if (!periodIds.length || !studentIds.length) {
    return res.json({
      ok: true,
      page,
      pageSize,
      total,
      rows: students.map((s) => ({
        id: s.id,
        rut: s.rut,
        name: s.name,
        email: s.email,
        enrollmentsCount: 0,
        finishedAttemptsCount: 0,
        status: "not_started" as DerivedStatus,
        lastAttempt: null,
      })),
      courses: [],
    });
  }

  // 3) Enrollments agregados por estudiante (+ filtro curso si viene)
  // MySQL: JSON_EXTRACT(meta, '$.course') -> '"2A"' (con comillas)
  const enrollmentWhere: any = {
    periodId: { [Op.in]: periodIds },
    studentUserId: { [Op.in]: studentIds },
  };

  if (course) {
    enrollmentWhere[Op.and] = [
      // comparamos contra `"curso"` porque JSON_EXTRACT devuelve string JSON
      Enrollment.sequelize!.where(
        Enrollment.sequelize!.fn(
          "JSON_EXTRACT",
          Enrollment.sequelize!.col("meta"),
          "$.course"
        ),
        `"${course}"`
      ),
    ];
  }

  const enrollAgg = await Enrollment.findAll({
    where: enrollmentWhere,
    attributes: ["studentUserId", [fn("COUNT", col("id")), "enrollmentsCount"]],
    group: ["studentUserId"],
    raw: true,
  });

  // Si filtraste por curso, hay estudiantes que NO tienen enrollment en ese curso:
  // en ese caso, mejor devolver solo los que tienen match (más consistente con filtro).
  const allowedStudentIds = new Set<number>(
    enrollAgg.map((r: any) => Number(r.studentUserId))
  );

  const filteredStudents = course
    ? students.filter((s) => allowedStudentIds.has(s.id))
    : students;

  const filteredStudentIds = filteredStudents.map((s) => s.id);

  // mapas enrollmentsCount
  const enrollByStudent = new Map<number, number>();
  for (const r of enrollAgg as any[]) {
    enrollByStudent.set(Number(r.studentUserId), Number(r.enrollmentsCount));
  }

  // 4) Finished attempts agregados por estudiante (en periodos de esta org)
  const finishedAgg = filteredStudentIds.length
    ? await Attempt.findAll({
        where: {
          periodId: { [Op.in]: periodIds },
          userId: { [Op.in]: filteredStudentIds },
          status: "finished",
        },
        attributes: [
          "userId",
          [fn("COUNT", col("id")), "finishedAttemptsCount"],
        ],
        group: ["userId"],
        raw: true,
      })
    : [];

  const finishedByStudent = new Map<number, number>();
  for (const r of finishedAgg as any[]) {
    finishedByStudent.set(Number(r.userId), Number(r.finishedAttemptsCount));
  }

  // 5) Último attempt por estudiante (en esta org)
  // MVP: traemos todos y hacemos "reduce" (ok para pageSize<=200)
  const attempts = filteredStudentIds.length
    ? await Attempt.findAll({
        where: {
          periodId: { [Op.in]: periodIds },
          userId: { [Op.in]: filteredStudentIds },
        },
        attributes: [
          "id",
          "userId",
          "status",
          "answeredCount",
          "createdAt",
          "finishedAt",
        ],
        order: [["createdAt", "DESC"]],
      })
    : [];

  const lastAttemptByUserId = new Map<number, any>();
  for (const a of attempts as any[]) {
    if (!lastAttemptByUserId.has(a.userId))
      lastAttemptByUserId.set(a.userId, a);
  }

  // 6) Cursos disponibles (para armar el dropdown)
  // Esto se puede optimizar; para MVP lo armamos desde enrollments del scope
  const allEnrollments = await Enrollment.findAll({
    where: {
      periodId: { [Op.in]: periodIds },
      studentUserId: { [Op.in]: studentIds },
    },
    attributes: ["meta"],
    raw: true,
  });

  const coursesSet = new Set<string>();
  for (const e of allEnrollments as any[]) {
    const c =
      e.meta && (e.meta as any).course
        ? String((e.meta as any).course).trim()
        : "";
    if (c) coursesSet.add(c);
  }
  const courses = Array.from(coursesSet).sort((a, b) => a.localeCompare(b));

  // 7) Response rows
  const rows = filteredStudents.map((s) => {
    const last = lastAttemptByUserId.get(s.id) ?? null;
    const status = normalizeStatusFromAttempt(last);

    return {
      id: s.id,
      rut: s.rut,
      name: s.name,
      email: s.email,

      enrollmentsCount: enrollByStudent.get(s.id) ?? 0,
      finishedAttemptsCount: finishedByStudent.get(s.id) ?? 0,

      status,
      lastAttempt: last
        ? {
            id: last.id,
            status: last.status,
            answeredCount: last.answeredCount,
            createdAt: last.createdAt,
            finishedAt: last.finishedAt,
          }
        : null,
    };
  });

  return res.json({
    ok: true,
    page,
    pageSize,
    total: course ? rows.length : total, // MVP: si filtras por curso, total real requeriría otra query
    courses,
    rows,
  });
}

export async function adminGetStudentDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orgId = req.auth?.organizationId;
    if (!orgId)
      return res.status(401).json({ ok: false, error: "Unauthorized" });

    const studentId = Number(req.params.studentId);
    if (!Number.isFinite(studentId)) {
      return res.status(400).json({ ok: false, error: "Invalid studentId" });
    }

    const student = await User.findOne({
      where: { id: studentId, role: "student", organizationId: orgId },
      attributes: ["id", "rut", "name", "email"],
    });

    if (!student) {
      return res.status(404).json({ ok: false, error: "Student not found" });
    }

    const enrollments = await Enrollment.findAll({
      where: { studentUserId: student.id },
      attributes: ["id", "periodId", "status", "meta", "createdAt"],
      include: [
        {
          model: Period,
          as: "period",
          required: true,
          where: { organizationId: orgId },
          attributes: ["id", "name", "status", "startAt", "endAt", "testId"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const periodIds = enrollments.map((e: any) => e.periodId);

    const attempts = periodIds.length
      ? await Attempt.findAll({
          where: {
            userId: student.id,
            periodId: { [Op.in]: periodIds },
          },
          attributes: [
            "id",
            "periodId",
            "status",
            "answeredCount",
            "finishedAt",
            "createdAt",
          ],
          order: [["createdAt", "DESC"]],
        })
      : [];

    // Por si existiera más de 1 attempt por periodo: nos quedamos con el más reciente
    const attemptByPeriodId = new Map<number, any>();
    for (const a of attempts as any[]) {
      if (!attemptByPeriodId.has(a.periodId))
        attemptByPeriodId.set(a.periodId, a);
    }

    const rows = enrollments.map((e: any) => {
      const p = e.period;
      const a = attemptByPeriodId.get(e.periodId) ?? null;

      return {
        enrollmentId: e.id,
        enrollmentStatus: e.status,
        course: getCourseFromMeta(e.meta),
        derivedStatus: deriveStatus(a),
        createdAt: e.createdAt,
        period: {
          id: p.id,
          name: p.name,
          status: p.status,
          startAt: p.startAt ?? null,
          endAt: p.endAt ?? null,
          testId: p.testId,
        },
        attempt: a
          ? {
              id: a.id,
              status: a.status,
              answeredCount: a.answeredCount,
              createdAt: a.createdAt ?? null,
              finishedAt: a.finishedAt ?? null,
              periodId: a.periodId,
            }
          : null,
      };
    });

    return res.json({
      ok: true,
      student: {
        id: student.id,
        rut: (student as any).rut ?? null,
        name: student.name,
        email: (student as any).email ?? null,
      },
      enrollments: rows,
    });
  } catch (error) {
    return next(error);
  }
}
