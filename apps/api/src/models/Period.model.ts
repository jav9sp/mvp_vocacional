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
import Organization from "./Organization.model.ts";
import Test from "./Test.model.ts";

export type PeriodStatus = "draft" | "active" | "closed";

@Table({
  tableName: "periods",
  timestamps: true,
  indexes: [
    { name: "idx_periods_org", fields: ["organizationId"] },
    { name: "idx_periods_test", fields: ["testId"] },
  ],
})
class Period extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Index("idx_periods_org")
  @Column(DataType.INTEGER.UNSIGNED)
  declare organizationId: number;

  @ForeignKey(() => Test)
  @AllowNull(false)
  @Index("idx_periods_test")
  @Column(DataType.INTEGER.UNSIGNED)
  declare testId: number;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  declare name: string;

  @Default("draft")
  @AllowNull(false)
  @Index("idx_periods_status")
  @Column(DataType.ENUM("draft", "active", "closed"))
  declare status: PeriodStatus;

  @Column(DataType.DATE)
  declare startAt: Date | null;

  @Column(DataType.DATE)
  declare endAt: Date | null;

  @Column(DataType.JSON)
  declare settings: Record<string, any> | null;

  @BelongsTo(() => Organization, {
    foreignKey: "organizationId",
    as: "organization",
  })
  declare organization?: Organization;

  @BelongsTo(() => Test, { foreignKey: "testId", as: "test" })
  declare test?: Test;
}

export default Period;
