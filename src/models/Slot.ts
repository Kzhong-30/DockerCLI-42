import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type SlotStatus = 'available' | 'booked' | 'cancelled';

export interface SlotAttributes {
  id: string;
  scheduleId: string;
  doctorId: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  appointmentType: 'normal' | 'expert' | 'special';
  slotNumber: number;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  price: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SlotCreationAttributes extends Optional<SlotAttributes, 'id' | 'createdAt' | 'updatedAt' | 'status'> {}

export class Slot extends Model<SlotAttributes, SlotCreationAttributes> implements SlotAttributes {
  public id!: string;
  public scheduleId!: string;
  public doctorId!: string;
  public date!: string;
  public timeSlot!: 'morning' | 'afternoon' | 'evening';
  public appointmentType!: 'normal' | 'expert' | 'special';
  public slotNumber!: number;
  public startTime!: string;
  public endTime!: string;
  public status!: SlotStatus;
  public price!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Slot.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    scheduleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeSlot: {
      type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
      allowNull: false,
    },
    appointmentType: {
      type: DataTypes.ENUM('normal', 'expert', 'special'),
      allowNull: false,
    },
    slotNumber: {
      type: DataTypes.INTEGER,
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
    status: {
      type: DataTypes.ENUM('available', 'booked', 'cancelled'),
      allowNull: false,
      defaultValue: 'available',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'slots',
    modelName: 'Slot',
    indexes: [
      {
        unique: true,
        fields: ['scheduleId', 'slotNumber'],
      },
    ],
  }
);

export default Slot;
