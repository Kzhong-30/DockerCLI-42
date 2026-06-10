import { Router } from 'express';
import {
  getDoctorStats,
  getDepartmentStats,
  getSystemOverview,
} from '../controllers/statsController';

const router = Router();

/**
 * @swagger
 * /stats/overview:
 *   get:
 *     summary: 系统概览统计
 *     tags: [统计分析]
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/overview', getSystemOverview);

/**
 * @swagger
 * /stats/doctor/{id}:
 *   get:
 *     summary: 医生工作量统计
 *     tags: [统计分析]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 医生ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期（默认30天前）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期（默认今天）
 *     responses:
 *       200:
 *         description: 查询成功，包含接诊量、号源使用率、收入、类型分布、日趋势
 *       404:
 *         description: 医生不存在
 */
router.get('/doctor/:id', getDoctorStats);

/**
 * @swagger
 * /stats/department:
 *   get:
 *     summary: 科室预约饱和度统计
 *     tags: [统计分析]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期（默认今天）
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期（默认今天）
 *     responses:
 *       200:
 *         description: 查询成功，包含各科室饱和度、占用率、医生数、号源使用情况
 */
router.get('/department', getDepartmentStats);

export default router;
