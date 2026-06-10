import { Router } from 'express';
import {
  getDoctorQueue,
  callNext,
  completeAppointment,
  markNoShow,
} from '../controllers/queueController';

const router = Router();

/**
 * @swagger
 * /queue/{doctorId}:
 *   get:
 *     summary: 实时查询医生叫号状态和等待人数
 *     tags: [叫号系统]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: 医生ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 查询日期（默认今天）
 *     responses:
 *       200:
 *         description: 查询成功，包含当前叫号、等待人数、等待列表
 *       404:
 *         description: 医生不存在
 */
router.get('/:doctorId', getDoctorQueue);

/**
 * @swagger
 * /queue/call:
 *   post:
 *     summary: 呼叫下一位患者
 *     tags: [叫号系统]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 description: 排班ID
 *     responses:
 *       200:
 *         description: 叫号成功
 *       404:
 *         description: 无等待患者
 */
router.post('/call', callNext);

/**
 * @swagger
 * /queue/appointment/{id}/complete:
 *   post:
 *     summary: 完成就诊
 *     tags: [叫号系统]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 预约ID
 *     responses:
 *       200:
 *         description: 就诊完成
 */
router.post('/appointment/:id/complete', completeAppointment);

/**
 * @swagger
 * /queue/appointment/{id}/noshow:
 *   post:
 *     summary: 标记为爽约
 *     tags: [叫号系统]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 预约ID
 *     responses:
 *       200:
 *         description: 标记成功
 */
router.post('/appointment/:id/noshow', markNoShow);

export default router;
