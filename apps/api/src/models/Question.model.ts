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
import Test from "./Test.model.ts";

@Table({
  tableName: "questions",
  timestamps: true,
  indexes: [
    {
      name: "uniq_test_external",
      unique: true,
      fields: ["testId", "externalId"],
    },
  ],
})
class Question extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => Test)
  @AllowNull(false)
  @Index("idx_questions_test")
  @Column(DataType.INTEGER.UNSIGNED)
  declare testId: number;

  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare externalId: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare text: string;

  @AllowNull(false)
  @Column(DataType.STRING(10))
  declare area: string;

  @AllowNull(false)
  @Column(DataType.JSON)
  declare dim: string[];

  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare orderIndex: number;
}

export default Question;
