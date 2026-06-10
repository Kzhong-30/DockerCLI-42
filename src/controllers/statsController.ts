import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import db from '../models';
import dayjs from 'dayjs';

export const getDoctorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const doctor = await db.Doctor.findByPk(id, {
      include: [{ model: db.Department, as: 'department' }],
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: '医生不存在' });
      return;
    }

    const queryStartDate = (startDate as string) || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const queryEndDate = (endDate as string) || dayjs().format('YYYY-MM-DD');

    const appointmentWhere: any = {
      doctorId: id,
    };

    const slotWhere: any = {};
    slotWhere.date = {
      [Op.gte]: queryStartDate,
      [Op.lte]: queryEndDate,
    };

    const totalAppointments = await db.Appointment.count({
      where: appointmentWhere,
      include: [
        {
          model: db.Slot,
          as: 'slot',
          where: slotWhere,
          required: true,
        },
      ],
    });

    const completedAppointments = await db.Appointment.count({
      where: {
        ...appointmentWhere,
        status: 'completed',
      },
      include: [
        {
          model: db.Slot,
          as: 'slot',
          where: slotWhere,
          required: true,
        },
      ],
    });

    const cancelledAppointments = await db.Appointment.count({
      where: {
        ...appointmentWhere,
        status: 'cancelled',
      },
      include: [
        {
          model: db.Slot,
          as: 'slot',
          where: slotWhere,
          required: true,
        },
      ],
    });

    const noShowAppointments = await db.Appointment.count({
      where: {
        ...appointmentWhere,
        status: 'no_show',
      },
      include: [
        {
          model: db.Slot,
          as: 'slot',
          where: slotWhere,
          required: true,
        },
      ],
    });

    const totalSlots = await db.Slot.count({
      where: {
        doctorId: id,
        ...slotWhere,
      },
    });

    const bookedSlots = await db.Slot.count({
      where: {
        doctorId: id,
        status: { [Op.in]: ['booked', 'cancelled'] },
        ...slotWhere,
      },
    });

    const typeStats = await db.Appointment.findAll({
      where: appointmentWhere,
      attributes: [
        [fn('DISTINCT', col('slot.appointmentType')), 'appointmentType'],
        [fn('COUNT', col('appointment.id')), 'count'],
      ],
      include: [
        {
          model: db.Slot,
          as: 'slot',
          attributes: [],
          where: slotWhere,
          required: true,
        },
      ],
      group: ['slot.appointmentType'],
      raw: true,
    } as any);

    const dailyStats = await db.Appointment.findAll({
      where: appointmentWhere,
      attributes: [
        [col('slot.date'), 'date'],
        [fn('COUNT', col('appointment.id')), 'count'],
      ],
      include: [
        {
          model: db.Slot,
          as: 'slot',
          attributes: [],
          where: slotWhere,
          required: true,
        },
      ],
      group: ['slot.date'],
      order: [[literal('slot.date'), 'ASC']],
      raw: true,
    } as any);

    const revenueResult = await db.Slot.findAll({
      where: {
        doctorId: id,
        status: 'booked',
        ...slotWhere,
      },
      attributes: [[fn('SUM', col('price')), 'totalRevenue']],
      raw: true,
    } as any);

    const totalRevenue = parseFloat((revenueResult[0] as any)?.totalRevenue || '0');
    const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          title: doctor.title,
          department: (doctor as any).department?.name,
        },
        period: {
          startDate: queryStartDate,
          endDate: queryEndDate,
        },
        workload: {
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          noShowAppointments,
          completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
        },
        slots: {
          totalSlots,
          bookedSlots,
          availableSlots: totalSlots - bookedSlots,
          occupancyRate: occupancyRate.toFixed(2) + '%',
        },
        revenue: {
          totalRevenue: totalRevenue.toFixed(2),
        },
        typeStats,
        dailyStats,
      },
    });
  } catch (error) {
    console.error('Get doctor stats error:', error);
    res.status(500).json({ success: false, message: '查询医生统计失败', error: (error as Error).message });
  }
};

export const getDepartmentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const queryStartDate = (startDate as string) || dayjs().format('YYYY-MM-DD');
    const queryEndDate = (endDate as string) || dayjs().format('YYYY-MM-DD');

    const slotWhere: any = {
      date: {
        [Op.gte]: queryStartDate,
        [Op.lte]: queryEndDate,
      },
    };

    const departments = await db.Department.findAll({
      include: [
        {
          model: db.Doctor,
          as: 'doctors',
          include: [
            {
              model: db.Slot,
              as: 'slots',
              where: Object.keys(slotWhere).length > 0 ? slotWhere : undefined,
              required: false,
            },
            {
              model: db.Appointment,
              as: 'appointments',
              required: false,
            },
          ],
        },
      ],
    });

    const stats = await Promise.all(
      departments.map(async (dept) => {
        const deptData: any = dept.toJSON();
        const doctors = deptData.doctors || [];

        let totalSlots = 0;
        let bookedSlots = 0;
        let totalAppointments = 0;
        let completedAppointments = 0;

        for (const doctor of doctors) {
          const slots = doctor.slots || [];
          const appointments = doctor.appointments || [];

          const filteredSlots = slots.filter(
            (s: any) =>
              (!queryStartDate || s.date >= queryStartDate) &&
              (!queryEndDate || s.date <= queryEndDate)
          );

          totalSlots += filteredSlots.length;
          bookedSlots += filteredSlots.filter((s: any) => s.status === 'booked').length;

          const apptInSlotIds = filteredSlots.map((s: any) => s.id);
          const deptAppointments = appointments.filter((a: any) =>
            apptInSlotIds.includes(a.slotId)
          );

          totalAppointments += deptAppointments.length;
          completedAppointments += deptAppointments.filter(
            (a: any) => a.status === 'completed'
          ).length;
        }

        const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
        const saturationLevel =
          occupancyRate >= 90
            ? '爆满'
            : occupancyRate >= 70
            ? '饱和'
            : occupancyRate >= 50
            ? '正常'
            : occupancyRate >= 30
            ? '较空闲'
            : '空闲';

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          doctorCount: doctors.length,
          totalSlots,
          bookedSlots,
          availableSlots: totalSlots - bookedSlots,
          totalAppointments,
          completedAppointments,
          occupancyRate: occupancyRate.toFixed(2) + '%',
          saturationLevel,
        };
      })
    );

    const overallStats = {
      totalDepartments: stats.length,
      totalSlots: stats.reduce((sum, s) => sum + s.totalSlots, 0),
      totalBookedSlots: stats.reduce((sum, s) => sum + s.bookedSlots, 0),
      totalAppointments: stats.reduce((sum, s) => sum + s.totalAppointments, 0),
      averageOccupancyRate:
        (
          stats.reduce((sum, s) => sum + parseFloat(s.occupancyRate), 0) /
          (stats.length || 1)
        ).toFixed(2) + '%',
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate: queryStartDate,
          endDate: queryEndDate,
        },
        overview: overallStats,
        departments: stats,
      },
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({ success: false, message: '查询科室统计失败', error: (error as Error).message });
  }
};

export const getSystemOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = dayjs().format('YYYY-MM-DD');

    const totalDoctors = await db.Doctor.count();
    const totalDepartments = await db.Department.count();
    const totalPatients = await db.Patient.count();

    const todaySchedules = await db.Schedule.count({
      where: { date: today, isCancelled: false },
    });

    const todaySlots = await db.Slot.count({
      where: { date: today },
    });

    const todayBookedSlots = await db.Slot.count({
      where: { date: today, status: 'booked' },
    });

    const todayAppointments = await db.Appointment.count({
      where: {
        status: { [Op.in]: ['confirmed', 'pending', 'completed'] },
      },
      include: [
        {
          model: db.Slot,
          as: 'slot',
          where: { date: today },
          required: true,
        },
      ],
    });

    const blacklistedPatients = await db.Patient.count({
      where: { isBlacklisted: true },
    });

    res.json({
      success: true,
      data: {
        date: today,
        overview: {
          totalDoctors,
          totalDepartments,
          totalPatients,
          blacklistedPatients,
        },
        today: {
          schedules: todaySchedules,
          totalSlots: todaySlots,
          bookedSlots: todayBookedSlots,
          availableSlots: todaySlots - todayBookedSlots,
          appointments: todayAppointments,
          occupancyRate: todaySlots > 0 ? ((todayBookedSlots / todaySlots) * 100).toFixed(2) + '%' : '0%',
        },
      },
    });
  } catch (error) {
    console.error('Get system overview error:', error);
    res.status(500).json({ success: false, message: '查询系统概览失败', error: (error as Error).message });
  }
};
