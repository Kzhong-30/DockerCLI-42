import sequelize from '../config/database';
import Department from './Department';
import Doctor from './Doctor';
import Schedule from './Schedule';
import Slot from './Slot';
import Patient from './Patient';
import Appointment from './Appointment';
import Blacklist from './Blacklist';
import Holiday from './Holiday';

Department.hasMany(Doctor, {
  foreignKey: 'departmentId',
  as: 'doctors',
});

Doctor.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

Doctor.hasMany(Schedule, {
  foreignKey: 'doctorId',
  as: 'schedules',
});

Schedule.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Schedule.hasMany(Slot, {
  foreignKey: 'scheduleId',
  as: 'slots',
});

Slot.belongsTo(Schedule, {
  foreignKey: 'scheduleId',
  as: 'schedule',
});

Slot.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Doctor.hasMany(Slot, {
  foreignKey: 'doctorId',
  as: 'slots',
});

Patient.hasMany(Appointment, {
  foreignKey: 'patientId',
  as: 'appointments',
});

Appointment.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

Appointment.belongsTo(Slot, {
  foreignKey: 'slotId',
  as: 'slot',
});

Slot.hasMany(Appointment, {
  foreignKey: 'slotId',
  as: 'appointments',
});

Appointment.belongsTo(Schedule, {
  foreignKey: 'scheduleId',
  as: 'schedule',
});

Schedule.hasMany(Appointment, {
  foreignKey: 'scheduleId',
  as: 'appointments',
});

Appointment.belongsTo(Doctor, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Doctor.hasMany(Appointment, {
  foreignKey: 'doctorId',
  as: 'appointments',
});

Patient.hasMany(Blacklist, {
  foreignKey: 'patientId',
  as: 'blacklistRecords',
});

Blacklist.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

const db = {
  sequelize,
  Department,
  Doctor,
  Schedule,
  Slot,
  Patient,
  Appointment,
  Blacklist,
  Holiday,
};

export default db;
