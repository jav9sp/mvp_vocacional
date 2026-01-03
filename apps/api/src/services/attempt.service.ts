import Attempt from "../models/Attempt.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import Test from "../models/Test.model.ts";
import User from "../models/User.model.ts";

export async function getActiveTest(): Promise<Test> {
  const test = await Test.findOne({ where: { isActive: true } });
  if (!test) throw new Error("No active test configured");
  return test;
}

export async function getActiveEnrollment(
  userId: User["id"]
): Promise<Enrollment> {
  const enrollment = await Enrollment.findOne({
    where: { status: "active", studentUserId: userId },
    order: [["createdAt", "DESC"]], // 👈 define el “activo”
  });
  if (!enrollment) {
    throw new Error("No active enrollment for this student");
  }
  return enrollment;
}

export async function getOrCreateActiveAttempt(
  userId: User["id"]
): Promise<Attempt> {
  const test = await getActiveTest();
  const enrollment = await getActiveEnrollment(userId);

  // 1) Si ya finalizó alguna vez, NO crear otro (regla 1 intento)
  const finished = await Attempt.findOne({
    where: {
      userId,
      testId: test.id,
      periodId: enrollment.periodId,
      status: "finished",
    },
    // si tienes finishedAt bien seteado, esto es lo mejor:
    order: [["finishedAt", "DESC"]],
  });

  if (finished) return finished;

  // 2) Si hay uno en progreso, usarlo
  const inProgress = await Attempt.findOne({
    where: {
      userId,
      testId: test.id,
      periodId: enrollment.periodId,
      status: "in_progress",
    },
    order: [["createdAt", "DESC"]],
  });

  if (inProgress) return inProgress;

  // 3) Si no hay ninguno, crear nuevo
  return Attempt.create({
    userId,
    testId: test.id,
    periodId: enrollment.periodId,
    status: "in_progress",
    answeredCount: 0,
    finishedAt: null,
  });
}
