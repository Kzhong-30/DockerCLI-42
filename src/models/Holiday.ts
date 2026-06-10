import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface HolidayAttributes {
  id: string;
  date: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HolidayCreationAttributes extends Optional<HolidayAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Holiday extends Model<HolidayAttributes, HolidayCreationAttributes> implements HolidayAttributes {
  public id!: string;
  public date!: string;
  public name!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Holiday.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'holidays',
    modelName: 'Holiday',
  }
);

export default Holiday;
