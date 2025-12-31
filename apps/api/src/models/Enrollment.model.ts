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
} from "sequelize-typescript";
import Period from "./Period.model.js";
import User from "./User.model.js";

export type EnrollmentStatus = "invited" | "active" | "completed" | "removed";

@Table({
  tableName: "enrollments",
  timestamps: true,
  indexes: [
    {
      name: "uniq_period_student",
      unique: true,
      fields: ["periodId", "studentUserId"],
    },
    { name: "idx_enrollments_period", fields: ["periodId"] },
    { name: "idx_enrollments_student", fields: ["studentUserId"] },
  ],
})
class Enrollment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => Period)
  @AllowNull(false)
  @Index("idx_enrollments_period")
  @Column(DataType.INTEGER.UNSIGNED)
  declare periodId: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index("idx_enrollments_student")
  @Column(DataType.INTEGER.UNSIGNED)
  declare studentUserId: number;

  @Default("active")
  @AllowNull(false)
  @Column(DataType.ENUM("invited", "active", "completed", "removed"))
  declare status: EnrollmentStatus;

  @Column(DataType.JSON)
  declare meta: Record<string, any> | null;
}

export default Enrollment;
