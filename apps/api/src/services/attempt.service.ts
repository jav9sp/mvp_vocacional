import Attempt from "../models/Attempt.model.ts";
import Test from "../models/Test.model.ts";

export async function getActiveTest(): Promise<Test> {
  const test = await Test.findOne({ where: { isActive: true } });
  if (!test) throw new Error("No active test configured");
  return test;
}

export async function getOrCreateActiveAttempt(
  userId: number
): Promise<Attempt> {
  const test = await getActiveTest();

  const existing = await Attempt.findOne({
    where: { userId, testId: test.id, status: "in_progress" },
    order: [["createdAt", "DESC"]],
  });

  if (existing) return existing;

  return Attempt.create({
    userId,
    testId: test.id,
    status: "in_progress",
    answeredCount: 0,
    finishedAt: null,
  });
}
