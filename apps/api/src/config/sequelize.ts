import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import User from "../models/User.model.js";

dotenv.config();

export const db = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [User],
  logging: false,
});

export async function connectDB() {
  await db.authenticate();
  await db.sync({ alter: true });
  console.log("Conectado a la base de datos");
}
