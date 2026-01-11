import { Request, Response } from "express";

import { Op, fn, col, literal } from "sequelize";
import Period from "../models/Period.model.ts";
import Test from "../models/Test.model.ts";
import Organization from "../models/Organization.model.ts";
import Attempt from "../models/Attempt.model.ts";
import Enrollment from "../models/Enrollment.model.ts";

import {
  CreatePeriodSchema,
  PeriodIdParamsSchema,
  UpdatePeriodSchema,
} from "../types/schemas.ts";

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

export async function adminCreatePeriod(req: Request, res: Response) {
  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const parsed = CreatePeriodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid body",
      issues: parsed.error.issues,
    });
  }

  const { name, testId, status, startAt, endAt, settings } = parsed.data;

  // Resolver testId: si no viene, usar test activo
  let resolvedTestId = testId;
  if (!resolvedTestId) {
    const activeTest = await Test.findOne({ where: { isActive: true } });
    if (!activeTest) {
      return res
        .status(400)
        .json({ ok: false, error: "No active test configured" });
    }
    resolvedTestId = activeTest.id;
  } else {
    const exists = await Test.findByPk(resolvedTestId);
    if (!exists) {
      return res.status(400).json({ ok: false, error: "Test not found" });
    }
  }

  // (MVP) Validación simple de rango de fechas
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (start && end && start.getTime() > end.getTime()) {
    return res
      .status(400)
      .json({ ok: false, error: "startAt must be <= endAt" });
  }

  const period = await Period.create({
    organizationId: orgId,
    testId: resolvedTestId,
    name,
    status,
    startAt: start,
    endAt: end,
    settings: settings ?? null,
  } as any);

  return res.status(201).json({
    ok: true,
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      startAt: period.startAt,
      endAt: period.endAt,
      testId: period.testId,
      organizationId: period.organizationId,
      createdAt: period.createdAt,
    },
  });
}

export async function adminUpdatePeriod(req: Request, res: Response) {
  const orgId = req.auth?.organizationId;
  if (!orgId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const paramsParsed = PeriodIdParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid periodId" });
  }
  const { periodId } = paramsParsed.data;

  const bodyParsed = UpdatePeriodSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid body",
      issues: bodyParsed.error.issues,
    });
  }

  const period = await Period.findByPk(periodId);
  if (!period) return res.status(404).json({ ok: false, error: "Not found" });

  if (period.organizationId !== orgId) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const patch = bodyParsed.data;

  // Fechas: validación simple
  const start =
    patch.startAt !== undefined
      ? patch.startAt
        ? new Date(patch.startAt)
        : null
      : undefined;
  const end =
    patch.endAt !== undefined
      ? patch.endAt
        ? new Date(patch.endAt)
        : null
      : undefined;

  const startFinal = start !== undefined ? start : period.startAt;
  const endFinal = end !== undefined ? end : period.endAt;

  if (startFinal && endFinal && startFinal.getTime() > endFinal.getTime()) {
    return res
      .status(400)
      .json({ ok: false, error: "startAt must be <= endAt" });
  }

  // Reglas mínimas de transición (MVP)
  if (patch.status) {
    const from = period.status as string;
    const to = patch.status;

    // draft -> active -> closed
    const allowed =
      (from === "draft" && to === "active") ||
      (from === "active" && to === "closed") ||
      (from === "draft" && to === "closed") || // por si quieres cerrarlo sin usarlo
      from === to;

    if (!allowed) {
      return res.status(409).json({
        ok: false,
        error: `Invalid status transition: ${from} -> ${to}`,
      });
    }

    // si pasa a active y no tiene startAt, setearlo automáticamente
    if (to === "active" && !period.startAt && start === undefined) {
      period.startAt = new Date();
    }
  }

  // Aplicar cambios
  if (patch.name !== undefined) period.name = patch.name;
  if (patch.status !== undefined) period.status = patch.status as any;
  if (start !== undefined) period.startAt = start as any;
  if (end !== undefined) period.endAt = end as any;
  if (patch.settings !== undefined) period.settings = patch.settings as any;

  await period.save();

  return res.json({
    ok: true,
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      startAt: period.startAt,
      endAt: period.endAt,
      testId: period.testId,
      organizationId: period.organizationId,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    },
  });
}
