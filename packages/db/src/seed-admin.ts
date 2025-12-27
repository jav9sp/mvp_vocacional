import "dotenv/config";
import bcrypt from "bcrypt";
import { Sequelize } from "sequelize-typescript";

import User from "../../../apps/api/src/models/User.model.ts";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [User],
  logging: false,
});

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();

  const email = "admin@demo.cl";
  const password = "Admin1234!";
  const passwordHash = await bcrypt.hash(password, 10);

  const [admin, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      role: "admin",
      name: "Admin",
      email,
      passwordHash,
      mustChangePassword: false,
    },
  });

  console.log(created ? "Admin creado:" : "Admin ya existía:", admin.email);
  console.log("Password:", password);

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
