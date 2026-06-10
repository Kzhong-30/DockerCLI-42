import { Request, Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, date, timeSlot, appointmentType, departmentId } = req.query;

    const where: any = {
      status: 'available',
    };

    if (doctorId) where.doctorId = doctorId;
    if (date) where.date = date;
    if (timeSlot) where.timeSlot = timeSlot;
    if (appointmentType) where.appointmentType = appointmentType;

    const include: any[] = [
      {
        model: db.Schedule,
        as: 'schedule',
        where: { isCancelled: false },
        required: true,
      },
      {
        model: db.Doctor,
        as: 'doctor',
        include: [{ model: db.Department, as: 'department' }],
      },
    ];

    if (departmentId) {
      (include[1] as any).where = { departmentId };
    }

    const slots = await db.Slot.findAll({
      where,
      include,
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });

    res.json({
      success: true,
      data: slots,
      total: slots.length,
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ success: false, message: '查询号源失败', error: (error as Error).message });
  }
};

export const getSlotById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const slot = await db.Slot.findByPk(id, {
      include: [
        {
          model: db.Schedule,
          as: 'schedule',
        },
        {
          model: db.Doctor,
          as: 'doctor',
          include: [{ model: db.Department, as: 'department' }],
        },
      ],
    });

    if (!slot) {
      res.status(404).json({ success: false, message: '号源不存在' });
      return;
    }

    res.json({
      success: true,
      data: slot,
    });
  } catch (error) {
    console.error('Get slot error:', error);
    res.status(500).json({ success: false, message: '查询号源失败', error: (error as Error).message });
  }
};

export const getSlotsByDate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const { doctorId } = req.query;

    const where: any = { date };
    if (doctorId) where.doctorId = doctorId;

    const slots = await db.Slot.findAll({
      where,
      include: [
        {
          model: db.Schedule,
          as: 'schedule',
          where: { isCancelled: false },
          required: true,
        },
        {
          model: db.Doctor,
          as: 'doctor',
          include: [{ model: db.Department, as: 'department' }],
        },
      ],
      order: [['startTime', 'ASC'], ['slotNumber', 'ASC']],
    });

    const grouped: Record<string, any> = {};
    for (const slot of slots) {
      const key = `${slot.doctorId}_${slot.timeSlot}_${slot.appointmentType}`;
      if (!grouped[key]) {
        grouped[key] = {
          doctor: (slot as any).doctor,
          timeSlot: slot.timeSlot,
          appointmentType: slot.appointmentType,
          date: slot.date,
          totalSlots: 0,
          availableSlots: 0,
          bookedSlots: 0,
          slots: [],
        };
      }
      grouped[key].totalSlots++;
      if (slot.status === 'available') grouped[key].availableSlots++;
      if (slot.status === 'booked') grouped[key].bookedSlots++;
      grouped[key].slots.push(slot);
    }

    res.json({
      success: true,
      data: Object.values(grouped),
      total: slots.length,
    });
  } catch (error) {
    console.error('Get slots by date error:', error);
    res.status(500).json({ success: false, message: '查询号源失败', error: (error as Error).message });
  }
};
