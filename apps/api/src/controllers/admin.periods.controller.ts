import Period from "../models/Period.model.js";
import Test from "../models/Test.model.js";
import Organization from "../models/Organization.model.js";

export async function adminListPeriods(req: any, res: any) {
  // MVP: si tu User aún no tiene organizationId, tomamos la primera org.
  // Luego lo cambias a: const orgId = req.user.organizationId;
  const org = await Organization.findOne({ order: [["id", "ASC"]] });
  if (!org)
    return res.status(500).json({ ok: false, error: "No organization found" });

  const periods = await Period.findAll({
    where: { organizationId: org.id },
    order: [["createdAt", "DESC"]],
  });

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
    })),
  });
}
