import { z } from "zod";

export const PeriodStatusSchema = z.enum(["draft", "active", "closed"]);
export type PeriodStatus = z.infer<typeof PeriodStatusSchema>;

export const SummaryRespSchema = z.object({
  ok: z.boolean(),
  period: z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    startAt: z.string().nullable(),
    endAt: z.string().nullable(),
    testId: z.number(),
    createdAt: z.string(),
  }),
  counts: z.object({
    studentsCount: z.number(),
    startedCount: z.number(),
    finishedCount: z.number(),
    notStartedCount: z.number(),
    completionPct: z.number(),
  }),
});
export type SummaryResp = z.infer<typeof SummaryRespSchema>;

export const StudentStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "finished",
]);
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

export const StudentRowSchema = z.object({
  enrollmentId: z.number(),
  student: z.object({
    id: z.number(),
    rut: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(), // por si viene null en DB
  }),
  status: StudentStatusSchema,
  attempt: z
    .object({
      id: z.number(),
      status: z.enum(["in_progress", "finished"]),
      answeredCount: z.number(),
      finishedAt: z.string().nullable(),
      createdAt: z.string(),
    })
    .nullable(),
});
export type StudentRow = z.infer<typeof StudentRowSchema>;

export const StudentsRespSchema = z.object({
  ok: z.boolean(),
  period: z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    testId: z.number(),
  }),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  courses: z.array(z.string()).optional(),
  rows: z.array(StudentRowSchema),
});
export type StudentsResp = z.infer<typeof StudentsRespSchema>;
