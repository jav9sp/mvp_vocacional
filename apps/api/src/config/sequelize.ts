import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import User from "../models/User.model.ts";
import Test from "../models/Test.model.ts";
import Question from "../models/Question.model.ts";
import Attempt from "../models/Attempt.model.ts";
import Answer from "../models/Answer.model.ts";
import Result from "../models/Result.model.ts";

dotenv.config();

export const db = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [User, Test, Question, Attempt, Answer, Result],
  logging: false,
});

export async function connectDB() {
  await db.authenticate();
  await db.sync({ alter: true });
  console.log("Conectado a la base de datos");
}
