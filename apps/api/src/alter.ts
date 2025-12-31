import "dotenv/config";
import { sequelize } from "./config/sequelize.ts";

async function main() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log("DB alter OK");
  process.exit(0);
}

main().catch((e) => {
  console.error("DB alter failed:", e);
  process.exit(1);
});
