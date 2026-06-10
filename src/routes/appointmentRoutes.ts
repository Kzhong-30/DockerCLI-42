import { Router } from 'express';
import {
  createAppointment,
  getAppointmentById,
  cancelAppointment,
  getAppointmentsByPatient,
  addToBlacklist,
  removeFromBlacklist,
  getBlacklist,
} from '../controllers/appointmentController';

const router = Router();

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: 患者预约
 *     tags: [预约管理]
 *     description: 创建预约，校验号源可用性和预约规则冲突
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotId
 *               - patientInfo
 *             properties:
 *               slotId:
 *                 type: string
 *                 description: 号源ID
 *               patientInfo:
 *                 type: object
 *                 required:
 *                   - name
 *                   - idCard
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: 患者姓名
 *                   idCard:
 *                     type: string
 *                     description: 身份证号
 *                   phone:
 *                     type: string
 *                     description: 手机号
 *                   gender:
 *                     type: string
 *                     enum: [male, female]
 *                   birthDate:
 *                     type: string
 *                     format: date
 *                   address:
 *                     type: string
 *               symptoms:
 *                 type: string
 *                 description: 症状描述
 *     responses:
 *       201:
 *         description: 预约成功
 *       400:
 *         description: 参数错误
 *       403:
 *         description: 黑名单限制
 *       409:
 *         description: 号源不可用或重复预约
 */
router.post('/', createAppointment);

/**
 * @swagger
 * /appointments/patient:
 *   get:
 *     summary: 查询患者预约列表
 *     tags: [预约管理]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: 患者ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 预约状态
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
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/patient', getAppointmentsByPatient);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: 查询预约详情和排队序号
 *     tags: [预约管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 预约ID
 *     responses:
 *       200:
 *         description: 查询成功，包含排队序号和等待人数
 *       404:
 *         description: 预约不存在
 */
router.get('/:id', getAppointmentById);

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   post:
 *     summary: 取消预约
 *     tags: [预约管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 预约ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: 取消原因
 *     responses:
 *       200:
 *         description: 取消成功
 *       404:
 *         description: 预约不存在
 *       409:
 *         description: 当前状态无法取消
 */
router.post('/:id/cancel', cancelAppointment);

/**
 * @swagger
 * /appointments/blacklist:
 *   get:
 *     summary: 查询黑名单列表
 *     tags: [黑名单管理]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否有效
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: 患者ID
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/blacklist/list', getBlacklist);

/**
 * @swagger
 * /appointments/blacklist:
 *   post:
 *     summary: 加入黑名单
 *     tags: [黑名单管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - reason
 *               - startDate
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: 患者ID
 *               reason:
 *                 type: string
 *                 description: 加入原因
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: 开始日期
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: 结束日期
 *     responses:
 *       201:
 *         description: 加入成功
 */
router.post('/blacklist/add', addToBlacklist);

/**
 * @swagger
 * /appointments/blacklist/{id}/remove:
 *   post:
 *     summary: 移出黑名单
 *     tags: [黑名单管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 黑名单记录ID
 *     responses:
 *       200:
 *         description: 移出成功
 */
router.post('/blacklist/:id/remove', removeFromBlacklist);

export default router;
