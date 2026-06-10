import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PatientAttributes {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  gender?: 'male' | 'female';
  birthDate?: string;
  address?: string;
  noShowCount: number;
  isBlacklisted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PatientCreationAttributes extends Optional<PatientAttributes, 'id' | 'createdAt' | 'updatedAt' | 'noShowCount' | 'isBlacklisted'> {}

export class Patient extends Model<PatientAttributes, PatientCreationAttributes> implements PatientAttributes {
  public id!: string;
  public name!: string;
  public idCard!: string;
  public phone!: string;
  public gender?: 'male' | 'female';
  public birthDate?: string;
  public address?: string;
  public noShowCount!: number;
  public isBlacklisted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Patient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    idCard: {
      type: DataTypes.STRING(18),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    noShowCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isBlacklisted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'patients',
    modelName: 'Patient',
  }
);

export default Patient;
