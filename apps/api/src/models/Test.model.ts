import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
} from "sequelize-typescript";

@Table({ tableName: "tests", timestamps: true })
class Test extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING(40))
  declare key: string; // "inapv"

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare version: string; // "v1"

  @AllowNull(false)
  @Column(DataType.STRING(120))
  declare name: string;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;
}

export default Test;
