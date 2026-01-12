import { z } from "zod";

export const StudentEnrollmentRowSchema = z.object({
  enrollmentId: z.number(),
  status: z.string(),
  period: z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime().nullable(),
  }),
  test: z
    .object({
      id: z.number(),
      key: z.string(),
      version: z.string(),
      name: z.string(),
    })
    .nullable(),
  attempt: z
    .object({
      id: z.number(),
      status: z.enum(["in_progress", "finished"]),
      answeredCount: z.number(),
      finishedAt: z.iso.datetime().nullable(),
    })
    .nullable(),
});

export const StudentMyTestsRespSchema = z.object({
  ok: z.literal(true),
  items: z.array(StudentEnrollmentRowSchema),
});

export type StudentEnrollmentItem = z.infer<typeof StudentEnrollmentRowSchema>;
export type StudentMyTestsResp = z.infer<typeof StudentMyTestsRespSchema>;
