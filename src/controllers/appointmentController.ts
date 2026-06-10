import { Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import db from '../models';
import dayjs from 'dayjs';
import { APPOINTMENT_CONFIG } from '../config/constants';
import { generateAppointmentNo } from '../utils/scheduling';

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { slotId, patientInfo, symptoms } = req.body;

    if (!slotId || !patientInfo) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }

    if (!patientInfo.idCard || !patientInfo.name || !patientInfo.phone) {
      res.status(400).json({ success: false, message: '患者信息不完整' });
      return;
    }

    const slot = await db.Slot.findByPk(slotId, {
      include: [
        { model: db.Schedule, as: 'schedule' },
      ],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!slot) {
      res.status(404).json({ success: false, message: '号源不存在' });
      return;
    }

    if (slot.status !== 'available') {
      res.status(409).json({ success: false, message: '号源不可用' });
      return;
    }

    if ((slot as any).schedule?.isCancelled) {
      res.status(409).json({ success: false, message: '该排班已取消' });
      return;
    }

    const slotDate = dayjs(slot.date);
    const today = dayjs().startOf('day');
    const maxDate = today.add(APPOINTMENT_CONFIG.MAX_DAYS_AHEAD, 'day');

    if (slotDate.isBefore(today)) {
      res.status(400).json({ success: false, message: '不能预约过去的号源' });
      return;
    }

    if (slotDate.isAfter(maxDate)) {
      res.status(400).json({ success: false, message: `最多只能预约 ${APPOINTMENT_CONFIG.MAX_DAYS_AHEAD} 天内的号源` });
      return;
    }

    const [patient, created] = await db.Patient.findOrCreate({
      where: { idCard: patientInfo.idCard },
      defaults: {
        name: patientInfo.name,
        idCard: patientInfo.idCard,
        phone: patientInfo.phone,
        gender: patientInfo.gender,
        birthDate: patientInfo.birthDate,
        address: patientInfo.address,
      },
      transaction,
    });

    if (!created) {
      patient.name = patientInfo.name;
      patient.phone = patientInfo.phone;
      await patient.save({ transaction });
    }

    if (patient.isBlacklisted) {
      const activeBlacklist = await db.Blacklist.findOne({
        where: {
          patientId: patient.id,
          isActive: true,
          [Op.or]: [
            { endDate: { [Op.is]: null } },
            { endDate: { [Op.gte]: today.format('YYYY-MM-DD') } },
          ],
        } as any,
        transaction,
      });

      if (activeBlacklist) {
        res.status(403).json({
          success: false,
          message: `您已被列入黑名单，原因：${activeBlacklist.reason}`,
        });
        return;
      }
    }

    const todayAppointments = await db.Appointment.count({
      where: {
        patientId: patient.id,
        status: { [Op.in]: ['confirmed', 'pending'] },
      },
      include: [
        {
          model: db.Slot,
          as: 'slot',
          where: { date: slot.date },
          required: true,
        },
      ],
      transaction,
    });

    if (todayAppointments >= APPOINTMENT_CONFIG.MAX_APPOINTMENTS_PER_DAY) {
      res.status(409).json({
        success: false,
        message: `当日最多只能预约 ${APPOINTMENT_CONFIG.MAX_APPOINTMENTS_PER_DAY} 个号`,
      });
      return;
    }

    const duplicateAppointment = await db.Appointment.findOne({
      where: {
        patientId: patient.id,
        scheduleId: slot.scheduleId,
        status: { [Op.in]: ['confirmed', 'pending'] },
      },
      transaction,
    });

    if (duplicateAppointment) {
      res.status(409).json({ success: false, message: '您已预约该时段号源，请勿重复预约' });
      return;
    }

    const queueNumber = await db.Appointment.count({
      where: {
        scheduleId: slot.scheduleId,
        status: { [Op.in]: ['confirmed', 'pending', 'completed'] },
      },
      transaction,
    }) + 1;

    slot.status = 'booked';
    await slot.save({ transaction });

    const appointment = await db.Appointment.create(
      {
        appointmentNo: generateAppointmentNo(),
        patientId: patient.id,
        slotId: slot.id,
        scheduleId: slot.scheduleId,
        doctorId: slot.doctorId,
        queueNumber,
        status: 'pending',
        symptoms,
      },
      { transaction }
    );

    await transaction.commit();

    const appointmentDetail = await db.Appointment.findByPk(appointment.id, {
      include: [
        { model: db.Patient, as: 'patient' },
        { model: db.Slot, as: 'slot' },
        { model: db.Doctor, as: 'doctor', include: [{ model: db.Department, as: 'department' }] },
        { model: db.Schedule, as: 'schedule' },
      ],
    });

    res.status(201).json({
      success: true,
      message: '预约成功',
      data: appointmentDetail,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create appointment error:', error);
    res.status(500).json({ success: false, message: '预约失败', error: (error as Error).message });
  }
};

export const getAppointmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const appointment = await db.Appointment.findByPk(id, {
      include: [
        { model: db.Patient, as: 'patient' },
        { model: db.Slot, as: 'slot' },
        {
          model: db.Doctor,
          as: 'doctor',
          include: [{ model: db.Department, as: 'department' }],
        },
        { model: db.Schedule, as: 'schedule' },
      ],
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: '预约不存在' });
      return;
    }

    const waitingCount = await db.Appointment.count({
      where: {
        scheduleId: appointment.scheduleId,
        status: { [Op.in]: ['confirmed', 'pending'] },
        queueNumber: { [Op.lt]: appointment.queueNumber },
      },
    });

    const data = appointment.toJSON();
    (data as any).waitingCount = waitingCount;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ success: false, message: '查询预约失败', error: (error as Error).message });
  }
};

export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await db.Appointment.findByPk(id, {
      include: [{ model: db.Slot, as: 'slot' }],
      transaction,
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: '预约不存在' });
      return;
    }

    if (appointment.status === 'cancelled') {
      res.status(409).json({ success: false, message: '预约已取消' });
      return;
    }

    if (appointment.status === 'completed' || appointment.status === 'no_show') {
      res.status(409).json({ success: false, message: '该状态预约无法取消' });
      return;
    }


    appointment.status = 'cancelled';
    appointment.cancelReason = reason || '患者主动取消';
    appointment.cancelledAt = new Date();
    await appointment.save({ transaction });

    await db.Slot.update(
      { status: 'available' },
      {
        where: { id: appointment.slotId },
        transaction,
      }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: '取消预约成功',
      data: appointment,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, message: '取消预约失败', error: (error as Error).message });
  }
};

export const getAppointmentsByPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, status, startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const slotWhere: any = {};
    if (startDate || endDate) {
      slotWhere.date = {};
      if (startDate) slotWhere.date[Op.gte] = startDate;
      if (endDate) slotWhere.date[Op.lte] = endDate;
    }

    const appointments = await db.Appointment.findAll({
      where,
      include: [
        { model: db.Patient, as: 'patient' },
        { model: db.Slot, as: 'slot', where: Object.keys(slotWhere).length > 0 ? slotWhere : undefined },
        {
          model: db.Doctor,
          as: 'doctor',
          include: [{ model: db.Department, as: 'department' }],
        },
        { model: db.Schedule, as: 'schedule' },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: appointments,
      total: appointments.length,
    });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({ success: false, message: '查询预约失败', error: (error as Error).message });
  }
};

export const addToBlacklist = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { patientId, reason, startDate, endDate } = req.body;

    if (!patientId || !reason || !startDate) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }

    const patient = await db.Patient.findByPk(patientId, { transaction });
    if (!patient) {
      res.status(404).json({ success: false, message: '患者不存在' });
      return;
    }

    patient.isBlacklisted = true;
    await patient.save({ transaction });

    const blacklist = await db.Blacklist.create(
      {
        patientId,
        reason,
        startDate,
        endDate,
        isActive: true,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: '已加入黑名单',
      data: blacklist,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Add to blacklist error:', error);
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
};

export const removeFromBlacklist = async (req: Request, res: Response): Promise<void> => {
  const transaction = await db.sequelize.transaction() as Transaction;

  try {
    const { id } = req.params;

    const blacklist = await db.Blacklist.findByPk(id, { transaction });
    if (!blacklist) {
      res.status(404).json({ success: false, message: '黑名单记录不存在' });
      return;
    }

    blacklist.isActive = false;
    await blacklist.save({ transaction });

    const activeCount = await db.Blacklist.count({
      where: { patientId: blacklist.patientId, isActive: true },
      transaction,
    });

    if (activeCount === 0) {
      await db.Patient.update(
        { isBlacklisted: false },
        { where: { id: blacklist.patientId }, transaction }
      );
    }

    await transaction.commit();

    res.json({
      success: true,
      message: '已移出黑名单',
      data: blacklist,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Remove from blacklist error:', error);
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
};

export const getBlacklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isActive, patientId } = req.query;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (patientId) where.patientId = patientId;

    const blacklist = await db.Blacklist.findAll({
      where,
      include: [{ model: db.Patient, as: 'patient' }],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: blacklist,
      total: blacklist.length,
    });
  } catch (error) {
    console.error('Get blacklist error:', error);
    res.status(500).json({ success: false, message: '查询黑名单失败', error: (error as Error).message });
  }
};
