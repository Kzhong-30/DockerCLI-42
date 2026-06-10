import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import sequelize from './config/database';
import swaggerSpec from './config/swagger';
import './models';
import db from './models';
import dayjs from 'dayjs';
import { generateSlotsForSchedule } from './utils/scheduling';

import scheduleRoutes from './routes/scheduleRoutes';
import slotRoutes from './routes/slotRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import queueRoutes from './routes/queueRoutes';
import statsRoutes from './routes/statsRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '医院预约排班管理系统 API',
    version: '1.0.0',
    docs: `/api-docs`,
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/schedules', scheduleRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.path,
  });
});

app.use((err: any, req: Request, res: Response, _next: any) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function initSeedData() {
  const deptCount = await db.Department.count();
  if (deptCount > 0) return;

  console.log('开始初始化测试数据...');

  const departments = await db.Department.bulkCreate([
    { name: '内科', description: '内科综合诊疗' },
    { name: '外科', description: '外科手术治疗' },
    { name: '儿科', description: '儿童疾病诊疗' },
    { name: '妇产科', description: '妇产科专科诊疗' },
    { name: '眼科', description: '眼科疾病诊疗' },
  ]);

  const deptMap: Record<string, string> = {};
  departments.forEach((d) => { deptMap[d.name] = d.id; });

  const doctors = await db.Doctor.bulkCreate([
    { name: '张医生', departmentId: deptMap['内科'], title: '主任医师', specialty: '心血管疾病', introduction: '30年临床经验' },
    { name: '李医生', departmentId: deptMap['内科'], title: '副主任医师', specialty: '呼吸系统', introduction: '擅长哮喘、肺炎治疗' },
    { name: '王医生', departmentId: deptMap['外科'], title: '主任医师', specialty: '普外科', introduction: '微创手术专家' },
    { name: '赵医生', departmentId: deptMap['外科'], title: '主治医师', specialty: '骨科', introduction: '骨科创伤治疗' },
    { name: '刘医生', departmentId: deptMap['儿科'], title: '主任医师', specialty: '小儿呼吸', introduction: '儿科专家' },
    { name: '陈医生', departmentId: deptMap['妇产科'], title: '副主任医师', specialty: '产科', introduction: '高危妊娠管理' },
    { name: '杨医生', departmentId: deptMap['眼科'], title: '主治医师', specialty: '白内障', introduction: '眼科手术' },
  ]);

  const doctorMap: Record<string, string> = {};
  doctors.forEach((d) => { doctorMap[d.name] = d.id; });

  await db.Holiday.create({ date: dayjs().add(10, 'day').format('YYYY-MM-DD'), name: '医院周年庆' });

  const today = dayjs();
  const schedulesData = [
    { doctorName: '张医生', date: today.format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:00', endTime: '12:00', appointmentType: 'expert' as const, capacity: 15 },
    { doctorName: '张医生', date: today.format('YYYY-MM-DD'), timeSlot: 'afternoon' as const, startTime: '14:00', endTime: '17:30', appointmentType: 'normal' as const, capacity: 20 },
    { doctorName: '李医生', date: today.format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:00', endTime: '12:00', appointmentType: 'normal' as const, capacity: 25 },
    { doctorName: '王医生', date: today.format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:30', endTime: '12:00', appointmentType: 'special' as const, capacity: 8 },
    { doctorName: '王医生', date: today.format('YYYY-MM-DD'), timeSlot: 'afternoon' as const, startTime: '14:00', endTime: '17:30', appointmentType: 'expert' as const, capacity: 12 },
    { doctorName: '赵医生', date: today.format('YYYY-MM-DD'), timeSlot: 'afternoon' as const, startTime: '14:00', endTime: '17:30', appointmentType: 'normal' as const, capacity: 20 },
    { doctorName: '刘医生', date: today.format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:00', endTime: '12:00', appointmentType: 'normal' as const, capacity: 30 },
    { doctorName: '刘医生', date: today.format('YYYY-MM-DD'), timeSlot: 'evening' as const, startTime: '18:00', endTime: '21:00', appointmentType: 'normal' as const, capacity: 15 },
    { doctorName: '陈医生', date: today.format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:00', endTime: '11:30', appointmentType: 'expert' as const, capacity: 10 },
    { doctorName: '杨医生', date: today.format('YYYY-MM-DD'), timeSlot: 'afternoon' as const, startTime: '14:00', endTime: '17:30', appointmentType: 'normal' as const, capacity: 20 },
    { doctorName: '张医生', date: today.add(1, 'day').format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:00', endTime: '12:00', appointmentType: 'expert' as const, capacity: 15 },
    { doctorName: '李医生', date: today.add(1, 'day').format('YYYY-MM-DD'), timeSlot: 'afternoon' as const, startTime: '14:00', endTime: '17:30', appointmentType: 'normal' as const, capacity: 25 },
    { doctorName: '张医生', date: today.add(2, 'day').format('YYYY-MM-DD'), timeSlot: 'morning' as const, startTime: '08:00', endTime: '12:00', appointmentType: 'normal' as const, capacity: 20 },
    { doctorName: '王医生', date: today.add(2, 'day').format('YYYY-MM-DD'), timeSlot: 'afternoon' as const, startTime: '14:00', endTime: '17:30', appointmentType: 'expert' as const, capacity: 12 },
  ];

  for (const sData of schedulesData) {
    const schedule = await db.Schedule.create({
      doctorId: doctorMap[sData.doctorName],
      date: sData.date,
      startTime: sData.startTime,
      endTime: sData.endTime,
      timeSlot: sData.timeSlot,
      appointmentType: sData.appointmentType,
      capacity: sData.capacity,
      repeatType: 'none',
    });
    await generateSlotsForSchedule(schedule);
  }

  await db.Patient.create({
    name: '测试患者',
    idCard: '110101199001011234',
    phone: '13800138000',
    gender: 'male',
    birthDate: '1990-01-01',
    address: '北京市朝阳区',
  });

  console.log(`✅ 初始化完成: ${departments.length} 科室, ${doctors.length} 医生, ${schedulesData.length} 排班`);
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    await sequelize.sync({ alter: true });
    console.log('数据库模型同步完成');

    await initSeedData();

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`🚀 医院预约排班管理系统已启动`);
      console.log(`📡 服务地址: http://localhost:${PORT}`);
      console.log(`📖 API 文档:  http://localhost:${PORT}/api-docs`);
      console.log(`🏥 健康检查:  http://localhost:${PORT}/health`);
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
