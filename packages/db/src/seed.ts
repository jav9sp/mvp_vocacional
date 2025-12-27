import "dotenv/config";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE!,
  process.env.MYSQL_USER!,
  process.env.MYSQL_PASSWORD!,
  {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    dialect: "mysql",
    logging: false,
  }
);

async function main() {
  await sequelize.authenticate();
  console.log("DB connection OK");
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
