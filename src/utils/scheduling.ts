import dayjs from 'dayjs';
import db from '../models';
import { Schedule } from '../models/Schedule';
import { Holiday } from '../models/Holiday';
import { APPOINTMENT_TYPE_PRICE } from '../config/constants';

export async function isHoliday(dateStr: string): Promise<boolean> {
  const holiday = await db.Holiday.findOne({
    where: { date: dateStr },
  });
  return !!holiday;
}

export function generateDatesByRepeatRule(
  startDate: string,
  repeatType: string,
  repeatEndDate?: string,
  repeatWeekdays?: string
): string[] {
  const dates: string[] = [];
  const start = dayjs(startDate);
  const end = repeatEndDate ? dayjs(repeatEndDate) : start.add(30, 'day');
  const weekdays = repeatWeekdays
    ? repeatWeekdays.split(',').map((w) => parseInt(w))
    : null;

  let current = start;

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    if (weekdays) {
      if (weekdays.includes(current.day())) {
        dates.push(current.format('YYYY-MM-DD'));
      }
    } else {
      dates.push(current.format('YYYY-MM-DD'));
    }

    switch (repeatType) {
      case 'daily':
        current = current.add(1, 'day');
        break;
      case 'weekly':
        current = current.add(1, 'week');
        break;
      case 'biweekly':
        current = current.add(2, 'week');
        break;
      case 'monthly':
        current = current.add(1, 'month');
        break;
      default:
        return dates;
    }

    if (dates.length > 365) break;
  }

  return dates;
}

export function calculateSlotTimes(
  startTime: string,
  endTime: string,
  capacity: number
): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  const slotMinutes = Math.floor(totalMinutes / capacity);

  for (let i = 0; i < capacity; i++) {
    const slotStartMin = startHour * 60 + startMin + i * slotMinutes;
    const slotEndMin = slotStartMin + slotMinutes;

    slots.push({
      startTime: `${String(Math.floor(slotStartMin / 60)).padStart(2, '0')}:${String(slotStartMin % 60).padStart(2, '0')}`,
      endTime: `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`,
    });
  }

  return slots;
}

export async function generateSlotsForSchedule(schedule: Schedule): Promise<void> {
  const date = schedule.date;

  if (await isHoliday(date)) {
    return;
  }

  const slotTimes = calculateSlotTimes(schedule.startTime, schedule.endTime, schedule.capacity);
  const price = APPOINTMENT_TYPE_PRICE[schedule.appointmentType] || 20;

  for (let i = 0; i < slotTimes.length; i++) {
    await db.Slot.create({
      scheduleId: schedule.id,
      doctorId: schedule.doctorId,
      date: date,
      timeSlot: schedule.timeSlot,
      appointmentType: schedule.appointmentType,
      slotNumber: i + 1,
      startTime: slotTimes[i].startTime,
      endTime: slotTimes[i].endTime,
      status: 'available',
      price: price,
    });
  }
}

export function generateAppointmentNo(): string {
  const date = dayjs().format('YYYYMMDD');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APT${date}${random}`;
}
