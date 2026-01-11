import "dotenv/config";
import bcrypt from "bcrypt";
import { Sequelize } from "sequelize-typescript";

import User from "../../../apps/api/src/models/User.model.ts";
import Organization from "../../../apps/api/src/models/Organization.model.ts";
import Enrollment from "../../../apps/api/src/models/Enrollment.model.ts";
import Period from "../../../apps/api/src/models/Period.model.ts";
import Test from "../../../apps/api/src/models/Test.model.ts";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [User, Organization, Enrollment, Period, Test],
  logging: false,
});

const STUDENT_COUNT = 10;
const DEFAULT_PASSWORD = "Student123!";

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let baseRut = "12345678";

  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const email = `student${i}@demo.cl`;

    const [student, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        organizationId: 1,
        rut: `${baseRut + i}-0`,
        role: "student",
        name: `Estudiante ${i}`,
        email,
        passwordHash,
        mustChangePassword: false,
      },
    });

    console.log(
      created
        ? `✔ Estudiante creado: ${student.email}`
        : `• Estudiante ya existe: ${student.email}`
    );
  }

  console.log("Seed de estudiantes completo");
  console.log("Password para todos:", DEFAULT_PASSWORD);

  await sequelize.close();
}

main().catch((err) => {
  console.error("Error en seed de estudiantes:", err);
  process.exit(1);
});
