import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  AutoIncrement,
  Unique,
  Default,
  AllowNull,
  Index,
  HasMany,
  BelongsTo,
} from "sequelize-typescript";
import Enrollment from "./Enrollment.model.ts";
import Organization from "./Organization.model.ts";

export type UserRole = "admin" | "student";

@Table({ tableName: "users", timestamps: true })
class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  declare organizationId: number;

  @Unique
  @AllowNull(false)
  @Index("idx_users_rut")
  @Column(DataType.STRING(20))
  declare rut: string;

  @AllowNull(false)
  @Index("idx_users_role")
  @Column(DataType.ENUM("admin", "student"))
  declare role: UserRole;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  declare name: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(180))
  declare email: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare passwordHash: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare mustChangePassword: boolean;

  @BelongsTo(() => Organization, {
    foreignKey: "organizationId",
    as: "organization",
  })
  declare organization?: Organization;

  @HasMany(() => Enrollment, { foreignKey: "studentUserId", as: "enrollments" })
  declare enrollments?: Enrollment[];
}

export default User;
