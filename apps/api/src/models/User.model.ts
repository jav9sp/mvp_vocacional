import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  Default,
  AllowNull,
} from "sequelize-typescript";

export type UserRole = "admin" | "student";

@Table({
  tableName: "users",
  timestamps: true,
})
class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @Column({ allowNull: true, type: DataType.STRING(20) })
  declare rut: string | null;

  @AllowNull(false)
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
}

export default User;
