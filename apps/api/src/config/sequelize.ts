import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
import User from "../models/User.model.js";
import Test from "../models/Test.model.js";
import Question from "../models/Question.model.js";
import Attempt from "../models/Attempt.model.js";
import Answer from "../models/Answer.model.js";
import Result from "../models/Result.model.js";
import Organization from "../models/Organization.model.js";
import Period from "../models/Period.model.js";
import Enrollment from "../models/Enrollment.model.js";

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
