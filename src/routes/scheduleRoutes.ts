import { Router } from 'express';
import {
  createSchedule,
  cancelSchedule,
  getSchedules,
  getScheduleById,
  createHoliday,
} from '../controllers/scheduleController';

const router = Router();

/**
 * @swagger
 * /schedules:
 *   post:
 *     summary: 创建医生排班
 *     tags: [排班管理]
 *     description: 设置医生出诊时间，支持重复规则、节假日例外
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - date
 *               - startTime
 *               - endTime
 *               - timeSlot
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: 医生ID
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 出诊日期 YYYY-MM-DD
 *               startTime:
 *                 type: string
 *                 description: 开始时间 HH:mm
 *               endTime:
 *                 type: string
 *                 description: 结束时间 HH:mm
 *               timeSlot:
 *                 type: string
 *                 enum: [morning, afternoon, evening]
 *                 description: 时段
 *               appointmentType:
 *                 type: string
 *                 enum: [normal, expert, special]
 *                 default: normal
 *                 description: 号别（普通/专家/特需）
 *               capacity:
 *                 type: integer
 *                 default: 20
 *                 description: 号源数量
 *               repeatType:
 *                 type: string
 *                 enum: [none, daily, weekly, biweekly, monthly]
 *                 default: none
 *                 description: 重复类型
 *               repeatEndDate:
 *                 type: string
 *                 format: date
 *                 description: 重复结束日期
 *               repeatWeekdays:
 *                 type: string
 *                 description: 重复星期，如 1,3,5 表示周一三五
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 */
router.post('/', createSchedule);

/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: 查询排班列表
 *     tags: [排班管理]
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *         description: 医生ID
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: 科室ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: timeSlot
 *         schema:
 *           type: string
 *         description: 时段
 *       - in: query
 *         name: isCancelled
 *         schema:
 *           type: boolean
 *         description: 是否取消
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/', getSchedules);

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     summary: 查询排班详情
 *     tags: [排班管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 排班ID
 *     responses:
 *       200:
 *         description: 查询成功
 *       404:
 *         description: 排班不存在
 */
router.get('/:id', getScheduleById);

/**
 * @swagger
 * /schedules/{id}/cancel:
 *   post:
 *     summary: 取消排班（临时停诊）
 *     tags: [排班管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 排班ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: 停诊原因
 *     responses:
 *       200:
 *         description: 取消成功
 */
router.post('/:id/cancel', cancelSchedule);

/**
 * @swagger
 * /schedules/holidays:
 *   post:
 *     summary: 设置节假日（排班例外）
 *     tags: [排班管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - name
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 节假日日期
 *               name:
 *                 type: string
 *                 description: 节假日名称
 *     responses:
 *       201:
 *         description: 配置成功
 */
router.post('/holidays', createHoliday);

export default router;
