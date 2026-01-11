import "dotenv/config";
import { Sequelize } from "sequelize-typescript";

import Test from "../../../apps/api/src/models/Test.model.ts";
import Question from "../../../apps/api/src/models/Question.model.ts";

// Importa tu data compartida
import { INAPV_QUESTIONS } from "../../../packages/shared/src/inapv/inapv.data.js";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [Test, Question],
  logging: false,
});

async function main() {
  await sequelize.authenticate();
  await sequelize.sync(); // ya tienes sync dev con alter en api; acá basta sync normal

  // 1) Asegurar que INAP-V sea el test activo
  await Test.update({ isActive: false }, { where: {} });

  const [test] = await Test.findOrCreate({
    where: { key: "inapv", version: "v1" },
    defaults: {
      key: "inapv",
      version: "v1",
      name: "INAP-V",
      isActive: true,
    },
  });

  // si ya existía, asegúralo activo
  if (!test.isActive) {
    test.isActive = true;
    await test.save();
  }

  // 2) Preparar preguntas para bulkCreate
  const rows = INAPV_QUESTIONS.map((q) => ({
    testId: test.id,
    externalId: q.id, // 1..103
    text: q.text,
    area: q.area,
    dim: q.dim, // JSON array
    orderIndex: q.id, // mismo orden
  }));

  // 3) Insertar / actualizar si existen
  // Requiere el índice único (testId, externalId)
  await Question.bulkCreate(rows, {
    updateOnDuplicate: ["text", "area", "dim", "orderIndex"],
  });

  const count = await Question.count({ where: { testId: test.id } });

  console.log(`✔ Test activo: ${test.key} ${test.version} (id=${test.id})`);
  console.log(`✔ Preguntas en DB para ese test: ${count} (esperado: 103)`);

  await sequelize.close();
}

main().catch((e) => {
  console.error("Error en seed INAP-V:", e);
  process.exit(1);
});
