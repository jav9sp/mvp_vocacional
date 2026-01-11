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
  BelongsTo,
} from "sequelize-typescript";
import Period from "./Period.model.ts";
import User from "./User.model.ts";

export type EnrollmentStatus = "invited" | "active" | "completed" | "removed";

@Table({
  tableName: "enrollments",
  timestamps: true,
  indexes: [
    { name: "idx_enrollments_period", fields: ["periodId"] },
    { name: "idx_enrollments_student", fields: ["studentUserId"] },
    {
      name: "uniq_period_student",
      unique: true,
      fields: ["periodId", "studentUserId"],
    },
  ],
})
class Enrollment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => Period)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare periodId: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare studentUserId: number;

  @Default("active")
  @AllowNull(false)
  @Column(DataType.ENUM("invited", "active", "completed", "removed"))
  declare status: EnrollmentStatus;

  @Column(DataType.JSON)
  declare meta: Record<string, any> | null;

  @BelongsTo(() => Period, { foreignKey: "periodId", as: "period" })
  declare period?: Period;

  @BelongsTo(() => User, { foreignKey: "studentUserId", as: "student" })
  declare student?: User;
}

export default Enrollment;
