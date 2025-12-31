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

  // 1) Si ya finalizó alguna vez, NO crear otro (regla 1 intento)
  const finished = await Attempt.findOne({
    where: { userId, testId: test.id, status: "finished" },
    // si tienes finishedAt bien seteado, esto es lo mejor:
    order: [["finishedAt", "DESC"]],
  });

  if (finished) return finished;

  // 2) Si hay uno en progreso, usarlo
  const inProgress = await Attempt.findOne({
    where: { userId, testId: test.id, status: "in_progress" },
    order: [["createdAt", "DESC"]],
  });

  if (inProgress) return inProgress;

  // 3) Si no hay ninguno, crear nuevo
  return Attempt.create({
    userId,
    testId: test.id,
    status: "in_progress",
    answeredCount: 0,
    finishedAt: null,
  });
}
