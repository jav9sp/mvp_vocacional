import { Request, Response } from "express";
import { z } from "zod";
import Period from "../models/Period.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import User from "../models/User.model.ts";
import Attempt from "../models/Attempt.model.ts";
import Result from "../models/Result.model.ts";
import { areaName } from "../utils/inapv-areas.ts";

const ParamsSchema = z.object({
  periodId: z.coerce.number().int().positive(),
});

function csvEscape(v: any) {
  const s = (v ?? "").toString();
  // escapa comillas y envuelve si hay coma o salto
  const escaped = s.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

export async function adminExportPeriodCSV(req: Request, res: Response) {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid periodId" });

  const { periodId } = parsed.data;

  const period = await Period.findByPk(periodId);
  if (!period)
    return res.status(404).json({ ok: false, error: "Period not found" });

  const enrollments = await Enrollment.findAll({
    where: { periodId },
    order: [["createdAt", "ASC"]],
  });

  const studentIds = enrollments.map((e) => e.studentUserId);

  const students = await User.findAll({
    where: { id: studentIds },
    attributes: ["id", "name", "email"],
  });
  const studentById = new Map(students.map((s) => [s.id, s]));

  // mismo enfoque temporal que el admin list: attempt por userId+testId
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

  const latestAttemptByUserId = new Map<number, Attempt>();
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
  const resultByAttemptId = new Map(results.map((r) => [r.attemptId, r]));

  // header CSV
  const header = [
    "student_id",
    "name",
    "email",
    "course",
    "progress_status",
    "answered_count",
    "attempt_id",
    "attempt_status",
    "top_areas",
  ];

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const enr of enrollments) {
    const student = studentById.get(enr.studentUserId);
    const attempt = latestAttemptByUserId.get(enr.studentUserId);
    const result = attempt ? resultByAttemptId.get(attempt.id) : null;

    let progressStatus: "not_started" | "in_progress" | "finished" =
      "not_started";
    if (attempt?.status === "in_progress") progressStatus = "in_progress";
    if (attempt?.status === "finished") progressStatus = "finished";

    const course =
      (enr.meta &&
        (enr.meta.course ||
          enr.meta.curso ||
          enr.meta.classroom ||
          enr.meta.grade)) ||
      "";

    const row = [
      enr.studentUserId,
      student?.name || "",
      student?.email || "",
      course,
      progressStatus,
      attempt?.answeredCount ?? "",
      attempt?.id ?? "",
      attempt?.status ?? "",
      result?.topAreas?.map(areaName).join(" | ") ?? "",
    ];

    lines.push(row.map(csvEscape).join(","));
  }

  const safe = period.name.replace(/[^\w\-]+/g, "_");
  const filename = `period_${period.id}_${safe}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(lines.join("\n"));
}
