import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  Index,
} from "sequelize-typescript";
import Attempt from "./Attempt.model.ts";
import Question from "./Question.model.ts";

@Table({
  tableName: "answers",
  timestamps: true,
  indexes: [
    {
      name: "uniq_attempt_question",
      unique: true,
      fields: ["attemptId", "questionId"],
    },
  ],
})
class Answer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => Attempt)
  @AllowNull(false)
  @Index("idx_answers_attempt")
  @Column(DataType.INTEGER.UNSIGNED)
  declare attemptId: number;

  @ForeignKey(() => Question)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare questionId: number;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare value: boolean;
}

export default Answer;
