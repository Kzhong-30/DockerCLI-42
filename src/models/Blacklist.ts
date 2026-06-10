import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface BlacklistAttributes {
  id: string;
  patientId: string;
  reason: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BlacklistCreationAttributes extends Optional<BlacklistAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> {}

export class Blacklist extends Model<BlacklistAttributes, BlacklistCreationAttributes> implements BlacklistAttributes {
  public id!: string;
  public patientId!: string;
  public reason!: string;
  public startDate!: string;
  public endDate?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Blacklist.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'blacklists',
    modelName: 'Blacklist',
  }
);

export default Blacklist;
