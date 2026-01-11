import Attempt from "../models/Attempt.model.ts";
import Enrollment from "../models/Enrollment.model.ts";
import Period from "../models/Period.model.ts";
import Test from "../models/Test.model.ts";
import User from "../models/User.model.ts";

export async function getTestById(id: Period["testId"]): Promise<Test> {
  const test = await Test.findOne({ where: { id } });
  if (!test) throw new Error("No active test configured");
  return test;
}

export async function getActiveEnrollment(
  userId: User["id"],
  orgId: User["organizationId"]
): Promise<Enrollment> {
  const enrollment = await Enrollment.findOne({
    where: { status: "active", studentUserId: userId },
    include: [
      {
        model: Period,
        as: "period",
        required: true,
        where: { organizationId: orgId, status: "active" },
        attributes: ["id", "organizationId", "testId", "status"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
  if (!enrollment) {
    throw new Error("No active enrollment for this student");
  }
  return enrollment;
}

export async function getOrCreateActiveAttempt(
  userId: User["id"],
  periodId: Period["id"],
  testId: Period["testId"]
): Promise<Attempt> {
  const finished = await Attempt.findOne({
    where: {
      userId,
      testId,
      periodId,
      status: "finished",
    },
    order: [["finishedAt", "DESC"]],
  });
  if (finished) return finished;

  const inProgress = await Attempt.findOne({
    where: {
      userId,
      testId,
      periodId,
      status: "in_progress",
    },
    order: [["createdAt", "DESC"]],
  });
  if (inProgress) return inProgress;

  return Attempt.create({
    userId,
    testId,
    periodId,
    status: "in_progress",
    answeredCount: 0,
    finishedAt: null,
  });
}
