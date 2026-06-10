import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type RepeatType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface ScheduleAttributes {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  appointmentType: 'normal' | 'expert' | 'special';
  capacity: number;
  repeatType: RepeatType;
  repeatEndDate?: string;
  repeatWeekdays?: string;
  isCancelled: boolean;
  cancelReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScheduleCreationAttributes extends Optional<ScheduleAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isCancelled' | 'repeatWeekdays'> {}

export class Schedule extends Model<ScheduleAttributes, ScheduleCreationAttributes> implements ScheduleAttributes {
  public id!: string;
  public doctorId!: string;
  public date!: string;
  public startTime!: string;
  public endTime!: string;
  public timeSlot!: 'morning' | 'afternoon' | 'evening';
  public appointmentType!: 'normal' | 'expert' | 'special';
  public capacity!: number;
  public repeatType!: RepeatType;
  public repeatEndDate?: string;
  public repeatWeekdays?: string;
  public isCancelled!: boolean;
  public cancelReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Schedule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    endTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    timeSlot: {
      type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
      allowNull: false,
    },
    appointmentType: {
      type: DataTypes.ENUM('normal', 'expert', 'special'),
      allowNull: false,
      defaultValue: 'normal',
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },
    repeatType: {
      type: DataTypes.ENUM('none', 'daily', 'weekly', 'biweekly', 'monthly'),
      allowNull: false,
      defaultValue: 'none',
    },
    repeatEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    repeatWeekdays: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    isCancelled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    cancelReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'schedules',
    modelName: 'Schedule',
  }
);

export default Schedule;
