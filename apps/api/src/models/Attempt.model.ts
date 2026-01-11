import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  Index,
  BelongsTo,
} from "sequelize-typescript";
import User from "./User.model.ts";
import Test from "./Test.model.ts";
import Period from "./Period.model.ts";

export type AttemptStatus = "in_progress" | "finished";

@Table({ tableName: "attempts", timestamps: true })
class Attempt extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index("idx_attempts_user")
  @Column(DataType.INTEGER.UNSIGNED)
  declare userId: number;

  @ForeignKey(() => Test)
  @AllowNull(false)
  @Index("idx_attempts_test")
  @Column(DataType.INTEGER.UNSIGNED)
  declare testId: number;

  @Default("in_progress")
  @AllowNull(false)
  @Column(DataType.ENUM("in_progress", "finished"))
  declare status: AttemptStatus;

  @Default(0)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare answeredCount: number;

  @Column(DataType.DATE)
  declare finishedAt: Date | null;

  @Index("idx_attempts_period")
  @ForeignKey(() => Period)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare periodId: number;

  @BelongsTo(() => Period, { foreignKey: "periodId", as: "period" })
  declare period?: Period;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;
}

export default Attempt;
