import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import User from "../models/User.model.ts";
import Test from "../models/Test.model.ts";
import Question from "../models/Question.model.ts";
import Attempt from "../models/Attempt.model.ts";
import Answer from "../models/Answer.model.ts";
import Result from "../models/Result.model.ts";
import Organization from "../models/Organization.model.ts";
import Period from "../models/Period.model.ts";
import Enrollment from "../models/Enrollment.model.ts";

dotenv.config();

export const sequelize = new Sequelize({
  dialect: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  models: [
    User,
    Test,
    Question,
    Attempt,
    Answer,
    Result,
    Organization,
    Period,
    Enrollment,
  ],
  logging: false,
});

export async function connectDB() {
  await sequelize.authenticate();
  await sequelize.sync();
  console.log("Conectado a la base de datos");
}
