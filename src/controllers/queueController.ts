import { Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import db from '../models';
import dayjs from 'dayjs';

export const getDoctorQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const queryDate = (date as string) || dayjs().format('YYYY-MM-DD');

    const doctor = await db.Doctor.findByPk(doctorId, {
      include: [{ model: db.Department, as: 'department' }],
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: '医生不存在' });
      return;
    }

    const schedules = await db.Schedule.findAll({
      where: {
        doctorId,
        date: queryDate,
        isCancelled: false,
      },
      order: [['startTime', 'ASC']],
    });

    const queueData = await Promise.all(
      schedules.map(async (schedule) => {
        const appointments = await db.Appointment.findAll({
          where: {
            scheduleId: schedule.id,
            status: { [Op.in]: ['confirmed', 'pending', 'completed'] },
          },
          include: [{ model: db.Patient, as: 'patient' }],
          order: [['queueNumber', 'ASC']],
        });

        const currentAppointment = appointments.find(
          (a) => a.status === 'confirmed'
        ) || appointments[0];

        const confirmedList = appointments.filter((a) => a.status === 'confirmed');
        const pendingList = appointments.filter((a) => a.status === 'pending');
        const completedList = appointments.filter((a) => a.status === 'completed');

        const totalSlots = schedule.capacity;
        const bookedSlots = appointments.length;
        const availableSlots = totalSlots - bookedSlots;

        return {
          scheduleId: schedule.id,
          timeSlot: schedule.timeSlot,
          appointmentType: schedule.appointmentType,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          totalSlots,
          bookedSlots,
          availableSlots,
          currentCalling: currentAppointment
            ? {
                queueNumber: currentAppointment.queueNumber,
                appointmentNo: currentAppointment.appointmentNo,
                patientName: (currentAppointment as any).patient?.name,
              }
            : null,
          waitingCount: confirmedList.length + pendingList.length,
          completedCount: completedList.length,
          confirmedList: confirmedList.map((a) => ({
            id: a.id,
            queueNumber: a.queueNumber,
            appointmentNo: a.appointmentNo,
            patientName: (a as any).patient?.name,
            status: a.status,
          })),
          pendingList: pendingList.map((a) => ({
            id: a.id,
            queueNumber: a.queueNumber,
            appointmentNo: a.appointmentNo,
            patientName: (a as any).patient?.name,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          title: doctor.title,
          department: (doctor as any).department?.name,
        },
        date: queryDate,
        queues: queueData,
      },
    });
  } catch (error) {
    console.error('Get doctor queue error:', error);
    res.status(500).json({ success: false, message: '查询叫号状态失败', error: (error as Error).message });
  }
};

export const callNext = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { scheduleId } = req.body;

    const schedule = await db.Schedule.findByPk(scheduleId, { transaction });
    if (!schedule) {
      res.status(404).json({ success: false, message: '排班不存在' });
      return;
    }

    const appointments = await db.Appointment.findAll({
      where: {
        scheduleId,
        status: { [Op.in]: ['confirmed', 'pending'] },
      },
      include: [{ model: db.Patient, as: 'patient' }],
      order: [['queueNumber', 'ASC']],
      transaction,
    });

    if (appointments.length === 0) {
      res.status(404).json({ success: false, message: '当前没有等待中的预约' });
      return;
    }

    const pendingAppointment = appointments.find((a) => a.status === 'pending');
    let targetAppointment;

    if (pendingAppointment) {
      targetAppointment = pendingAppointment;
      targetAppointment.status = 'confirmed';
      await targetAppointment.save({ transaction });
    } else {
      targetAppointment = appointments[0];
    }

    await transaction.commit();

    res.json({
      success: true,
      message: '叫号成功',
      data: {
        id: targetAppointment.id,
        queueNumber: targetAppointment.queueNumber,
        appointmentNo: targetAppointment.appointmentNo,
        patientName: (targetAppointment as any).patient?.name,
        timeSlot: schedule.timeSlot,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Call next error:', error);
    res.status(500).json({ success: false, message: '叫号失败', error: (error as Error).message });
  }
};

export const completeAppointment = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { id } = req.params;

    const appointment = await db.Appointment.findByPk(id, { transaction });
    if (!appointment) {
      res.status(404).json({ success: false, message: '预约不存在' });
      return;
    }

    if (appointment.status !== 'confirmed') {
      res.status(409).json({ success: false, message: '只有已确认的预约才能完成就诊' });
      return;
    }

    appointment.status = 'completed';
    await appointment.save({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: '就诊完成',
      data: appointment,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Complete appointment error:', error);
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
};

export const markNoShow = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { id } = req.params;

    const appointment = await db.Appointment.findByPk(id, { transaction });
    if (!appointment) {
      res.status(404).json({ success: false, message: '预约不存在' });
      return;
    }

    appointment.status = 'no_show';
    await appointment.save({ transaction });

    const patient = await db.Patient.findByPk(appointment.patientId, { transaction });
    if (patient) {
      patient.noShowCount = (patient.noShowCount || 0) + 1;
      await patient.save({ transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: '已标记为爽约',
      data: appointment,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Mark no show error:', error);
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
};
