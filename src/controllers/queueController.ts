import { Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import db from '../models';
import dayjs from 'dayjs';
import { APPOINTMENT_CONFIG } from '../config/constants';

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
            status: { [Op.in]: ['pending', 'confirmed', 'completed', 'no_show'] },
          },
          include: [
        { model: db.Patient, as: 'patient' },
        { model: db.Slot, as: 'slot' },
          ],
          order: [[{ model: db.Slot, as: 'slot' }, 'slotNumber', 'ASC']],
        });

        const currentAppointment = appointments.find(
          (a) => a.status === 'confirmed'
        );
        const confirmedList = appointments.filter((a) => a.status === 'confirmed');
        const pendingList = appointments.filter((a) => a.status === 'pending');
        const completedList = appointments.filter((a) => a.status === 'completed');

        const noShowList = appointments.filter((a) => a.status === 'no_show');
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
          currentCallNumber: schedule.currentCallNumber || 0,
          currentCalling: currentAppointment
            ? {
                slotNumber: (currentAppointment as any).slot?.slotNumber,
                appointmentNo: currentAppointment.appointmentNo,
                patientName: (currentAppointment as any).patient?.name,
              }
            : null,
          waitingCount: pendingList.length,
          completedCount: completedList.length,
          noShowCount: noShowList.length,
          confirmedList: confirmedList.map((a) => ({
            id: a.id,
            slotNumber: (a as any).slot?.slotNumber,
            appointmentNo: a.appointmentNo,
            patientName: (a as any).patient?.name,
            status: a.status,
          })),
          pendingList: pendingList.map((a) => ({
            id: a.id,
            slotNumber: (a as any).slot?.slotNumber,
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

    const nextAppointment = await db.Appointment.findOne({
      where: {
        scheduleId,
        status: 'pending',
      },
      include: [
        { model: db.Patient, as: 'patient' },
        { model: db.Slot, as: 'slot' },
      ],
      order: [[{ model: db.Slot, as: 'slot' }, 'slotNumber', 'ASC']],
      transaction,
    });

    if (!nextAppointment) {
      res.status(404).json({ success: false, message: '当前没有等待中的预约' });
      return;
    }


    nextAppointment.status = 'confirmed';
    await nextAppointment.save({ transaction });

    const slotNumber = (nextAppointment as any).slot?.slotNumber || 0;
    schedule.currentCallNumber = slotNumber;
    await schedule.save({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: '叫号成功',
      data: {
        id: nextAppointment.id,
        slotNumber: slotNumber,
        appointmentNo: nextAppointment.appointmentNo,
        patientName: (nextAppointment as any).patient?.name,
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

      if (patient.noShowCount >= APPOINTMENT_CONFIG.MAX_NO_SHOW_COUNT) {
        patient.isBlacklisted = true;
        await patient.save({ transaction });

        await db.Blacklist.create(
          {
            patientId: patient.id,
            reason: `累计爽约 ${patient.noShowCount} 次，自动加入黑名单`,
            startDate: dayjs().format('YYYY-MM-DD'),
            endDate: dayjs().add(APPOINTMENT_CONFIG.BLACKLIST_DAYS, 'day').format('YYYY-MM-DD'),
            isActive: true,
          },
          { transaction }
        );
      }
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
