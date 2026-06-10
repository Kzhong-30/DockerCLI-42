import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface AppointmentAttributes {
  id: string;
  appointmentNo: string;
  patientId: string;
  slotId: string;
  scheduleId: string;
  doctorId: string;
  queueNumber: number;
  status: AppointmentStatus;
  symptoms?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AppointmentCreationAttributes extends Optional<AppointmentAttributes, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'queueNumber'> {}

export class Appointment extends Model<AppointmentAttributes, AppointmentCreationAttributes> implements AppointmentAttributes {
  public id!: string;
  public appointmentNo!: string;
  public patientId!: string;
  public slotId!: string;
  public scheduleId!: string;
  public doctorId!: string;
  public queueNumber!: number;
  public status!: AppointmentStatus;
  public symptoms?: string;
  public cancelReason?: string;
  public cancelledAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Appointment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    appointmentNo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    slotId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    scheduleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    queueNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
      allowNull: false,
      defaultValue: 'confirmed',
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancelReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'appointments',
    modelName: 'Appointment',
  }
);

export default Appointment;
