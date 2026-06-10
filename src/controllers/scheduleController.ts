import { Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import db from '../models';
import { generateDatesByRepeatRule, generateSlotsForSchedule, isHoliday } from '../utils/scheduling';
import dayjs from 'dayjs';

export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const {
      doctorId,
      date,
      startTime,
      endTime,
      timeSlot,
      appointmentType = 'normal',
      capacity = 20,
      repeatType = 'none',
      repeatEndDate,
      repeatWeekdays,
    } = req.body;

    if (!doctorId || !date || !startTime || !endTime || !timeSlot) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }

    const doctor = await db.Doctor.findByPk(doctorId, { transaction });
    if (!doctor) {
      res.status(404).json({ success: false, message: '医生不存在' });
      return;
    }

    const dates = repeatType === 'none'
      ? [date]
      : generateDatesByRepeatRule(date, repeatType, repeatEndDate, repeatWeekdays);

    const createdSchedules = [];

    for (const d of dates) {
      if (await isHoliday(d)) {
        continue;
      }

      const existingSchedule = await db.Schedule.findOne({
        where: {
          doctorId,
          date: d,
          timeSlot,
          isCancelled: false,
        },
        transaction,
      });

      if (existingSchedule) {
        continue;
      }

      const schedule = await db.Schedule.create(
        {
          doctorId,
          date: d,
          startTime,
          endTime,
          timeSlot,
          appointmentType,
          capacity,
          repeatType,
          repeatEndDate,
          repeatWeekdays,
        },
        { transaction }
      );

      await generateSlotsForSchedule(schedule, transaction);

      createdSchedules.push(schedule);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: `成功创建 ${createdSchedules.length} 条排班记录`,
      data: createdSchedules,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create schedule error:', error);
    res.status(500).json({ success: false, message: '创建排班失败', error: (error as Error).message });
  }
};

export const cancelSchedule = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const schedule = await db.Schedule.findByPk(id, { transaction });
    if (!schedule) {
      res.status(404).json({ success: false, message: '排班不存在' });
      return;
    }

    schedule.isCancelled = true;
    schedule.cancelReason = reason || '临时停诊';
    await schedule.save({ transaction });

    await db.Slot.update(
      { status: 'cancelled' },
      {
        where: { scheduleId: id },
        transaction,
      }
    );

    await db.Appointment.update(
      { status: 'cancelled', cancelReason: '医生停诊', cancelledAt: new Date() },
      {
        where: {
          scheduleId: id,
          status: { [Op.in]: ['confirmed', 'pending'] },
        },
        transaction,
      }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: '排班已取消，相关号源和预约已处理',
      data: schedule,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel schedule error:', error);
    res.status(500).json({ success: false, message: '取消排班失败', error: (error as Error).message });
  }
};

export const getSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, departmentId, startDate, endDate, timeSlot, isCancelled } = req.query;

    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (timeSlot) where.timeSlot = timeSlot;
    if (isCancelled !== undefined) where.isCancelled = isCancelled === 'true';

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const include: any[] = [
      {
        model: db.Doctor,
        as: 'doctor',
        include: [{ model: db.Department, as: 'department' }],
      },
    ];

    if (departmentId) {
      include[0].where = { departmentId };
    }

    const schedules = await db.Schedule.findAll({
      where,
      include,
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });

    res.json({
      success: true,
      data: schedules,
      total: schedules.length,
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ success: false, message: '查询排班失败', error: (error as Error).message });
  }
};

export const getScheduleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const schedule = await db.Schedule.findByPk(id, {
      include: [
        {
          model: db.Doctor,
          as: 'doctor',
          include: [{ model: db.Department, as: 'department' }],
        },
        {
          model: db.Slot,
          as: 'slots',
          order: [['slotNumber', 'ASC']],
        },
      ],
    });

    if (!schedule) {
      res.status(404).json({ success: false, message: '排班不存在' });
      return;
    }

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ success: false, message: '查询排班失败', error: (error as Error).message });
  }
};

export const createHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, name } = req.body;

    if (!date || !name) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }

    const [holiday, created] = await db.Holiday.findOrCreate({
      where: { date },
      defaults: { date, name },
    });

    if (!created) {
      res.status(409).json({ success: false, message: '该日期已存在节假日配置' });
      return;
    }

    res.status(201).json({
      success: true,
      message: '节假日配置成功',
      data: holiday,
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({ success: false, message: '配置节假日失败', error: (error as Error).message });
  }
};
