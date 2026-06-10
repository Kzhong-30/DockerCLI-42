import { Router, Request, Response } from 'express';
import db from '../models';
import { Op } from 'sequelize';

const router = Router();

router.get('/doctors', async (req: Request, res: Response) => {
  try {
    const { departmentId, name } = req.query;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (name) where.name = { [Op.like]: `%${name}%` };

    const doctors = await db.Doctor.findAll({
      where,
      include: [{ model: db.Department, as: 'department' }],
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: doctors, total: doctors.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询医生失败', error: (error as Error).message });
  }
});

router.get('/doctors/:id', async (req: Request, res: Response) => {
  try {
    const doctor = await db.Doctor.findByPk(req.params.id, {
      include: [{ model: db.Department, as: 'department' }],
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: '医生不存在' });
      return;
    }

    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询医生失败', error: (error as Error).message });
  }
});

router.post('/doctors', async (req: Request, res: Response) => {
  try {
    const { name, departmentId, title, specialty, introduction } = req.body;

    if (!name || !departmentId || !title) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }

    const doctor = await db.Doctor.create({
      name,
      departmentId,
      title,
      specialty,
      introduction,
    });

    res.status(201).json({ success: true, message: '创建成功', data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建医生失败', error: (error as Error).message });
  }
});

router.get('/departments', async (req: Request, res: Response) => {
  try {
    const departments = await db.Department.findAll({
      include: [{ model: db.Doctor, as: 'doctors' }],
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: departments, total: departments.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询科室失败', error: (error as Error).message });
  }
});

router.post('/departments', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }

    const department = await db.Department.create({ name, description });
    res.status(201).json({ success: true, message: '创建成功', data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建科室失败', error: (error as Error).message });
  }
});

router.get('/patients', async (req: Request, res: Response) => {
  try {
    const { idCard, phone, isBlacklisted } = req.query;
    const where: any = {};
    if (idCard) where.idCard = idCard;
    if (phone) where.phone = phone;
    if (isBlacklisted !== undefined) where.isBlacklisted = isBlacklisted === 'true';

    const patients = await db.Patient.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    res.json({ success: true, data: patients, total: patients.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询患者失败', error: (error as Error).message });
  }
});

router.get('/holidays', async (req: Request, res: Response) => {
  try {
    const holidays = await db.Holiday.findAll({
      order: [['date', 'ASC']],
    });
    res.json({ success: true, data: holidays, total: holidays.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询节假日失败', error: (error as Error).message });
  }
});

export default router;
