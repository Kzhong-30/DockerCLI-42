import { Router } from 'express';
import {
  getAvailableSlots,
  getSlotById,
  getSlotsByDate,
} from '../controllers/slotController';

const router = Router();

/**
 * @swagger
 * /slots:
 *   get:
 *     summary: 查询可用号源列表
 *     tags: [号源管理]
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *         description: 医生ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 日期
 *       - in: query
 *         name: timeSlot
 *         schema:
 *           type: string
 *           enum: [morning, afternoon, evening]
 *         description: 时段
 *       - in: query
 *         name: appointmentType
 *         schema:
 *           type: string
 *           enum: [normal, expert, special]
 *         description: 号别
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: 科室ID
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/', getAvailableSlots);

/**
 * @swagger
 * /slots/{id}:
 *   get:
 *     summary: 查询号源详情
 *     tags: [号源管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 号源ID
 *     responses:
 *       200:
 *         description: 查询成功
 *       404:
 *         description: 号源不存在
 */
router.get('/:id', getSlotById);

/**
 * @swagger
 * /slots/date/{date}:
 *   get:
 *     summary: 按日期查询号源分组
 *     tags: [号源管理]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 查询日期 YYYY-MM-DD
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *         description: 医生ID
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/date/:date', getSlotsByDate);

export default router;
