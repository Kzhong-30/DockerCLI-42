import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Department } from './Department';

export type DoctorTitle = '住院医师' | '主治医师' | '副主任医师' | '主任医师';

export interface DoctorAttributes {
  id: string;
  name: string;
  departmentId: string;
  title: DoctorTitle;
  specialty?: string;
  introduction?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DoctorCreationAttributes extends Optional<DoctorAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Doctor extends Model<DoctorAttributes, DoctorCreationAttributes> implements DoctorAttributes {
  public id!: string;
  public name!: string;
  public departmentId!: string;
  public title!: DoctorTitle;
  public specialty?: string;
  public introduction?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Doctor.init(
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
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Department,
        key: 'id',
      },
    },
    title: {
      type: DataTypes.ENUM('住院医师', '主治医师', '副主任医师', '主任医师'),
      allowNull: false,
    },
    specialty: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    introduction: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'doctors',
    modelName: 'Doctor',
  }
);

export default Doctor;
