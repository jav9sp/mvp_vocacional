import "dotenv/config";
import { Sequelize } from "sequelize-typescript";

import Organization from "../../../apps/api/src/models/Organization.model.ts";
import Period from "../../../apps/api/src/models/Period.model.ts";
import Enrollment from "../../../apps/api/src/models/Enrollment.model.ts";

import User from "../../../apps/api/src/models/User.model.ts";
import Test from "../../../apps/api/src/models/Test.model.ts";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [Organization, Period, Enrollment, User, Test],
  logging: false,
});

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();

  // 1) Org
  const [org] = await Organization.findOrCreate({
    where: { name: "Demo School" },
    defaults: { name: "Demo School" },
  });

  // 2) Test activo
  const test = await Test.findOne({ where: { isActive: true } });
  if (!test) throw new Error("No active test found. Run seed:inapv first.");

  // 3) Periodo activo (único por nombre + org + test)
  const [period] = await Period.findOrCreate({
    where: {
      organizationId: org.id,
      testId: test.id,
      name: "Periodo Demo INAP-V",
    },
    defaults: {
      organizationId: org.id,
      testId: test.id,
      name: "Periodo Demo INAP-V",
      status: "active",
      startAt: new Date(),
      endAt: null,
      settings: { allowResults: true },
    },
  });

  // Asegurar activo (por si existía)
  if (period.status !== "active") {
    period.status = "active";
    await period.save();
  }

  // 4) Enrollments para todos los estudiantes existentes
  const students = await User.findAll({ where: { role: "student" } });

  let created = 0;
  for (const s of students) {
    const [enr, wasCreated] = await Enrollment.findOrCreate({
      where: { periodId: period.id, studentUserId: s.id },
      defaults: {
        periodId: period.id,
        studentUserId: s.id,
        status: "active",
        meta: { course: "4A" },
      },
    });
    if (wasCreated) created++;
  }

  console.log("✔ Organization:", org.id, org.name);
  console.log("✔ Period:", period.id, period.name, `(testId=${test.id})`);
  console.log(
    `✔ Enrollments: ${created} creados / ${students.length} estudiantes totales`
  );

  await sequelize.close();
}

main().catch((e) => {
  console.error("Seed admin structure failed:", e);
  process.exit(1);
});
