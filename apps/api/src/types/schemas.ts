import { z } from "zod";

export const CreatePeriodSchema = z.object({
  name: z.string().trim().min(3).max(200),
  testId: z.number().int().positive().optional(),
  status: z.enum(["draft", "active", "closed"]).optional().default("draft"),
  startAt: z.iso.datetime().nullable().optional(),
  endAt: z.iso.datetime().nullable().optional(),
  settings: z.record(z.string(), z.any()).nullable().optional(),
});

export const UpdatePeriodSchema = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  startAt: z.iso.datetime().nullable().optional(),
  endAt: z.iso.datetime().nullable().optional(),
  settings: z.record(z.string(), z.any()).nullable().optional(),
});

export const PeriodIdParamsSchema = z.object({
  periodId: z.coerce.number().int().positive(),
});
