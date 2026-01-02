import { Request, Response } from "express";
import { z } from "zod";
import { buildPeriodReport } from "../services/period-report.service.ts";

const ParamsSchema = z.object({
  periodId: z.coerce.number().int().positive(),
});

export async function adminGetPeriodReport(req: Request, res: Response) {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid periodId" });

  try {
    const report = await buildPeriodReport(parsed.data.periodId);
    return res.json({ ok: true, ...report });
  } catch (e: any) {
    if (e.message === "Period not found")
      return res.status(404).json({ ok: false, error: e.message });
    return res.status(500).json({ ok: false, error: "Report failed" });
  }
}
