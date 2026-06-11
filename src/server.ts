import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import swaggerUi from 'swagger-ui-express';
import sequelize from './config/database';
import swaggerSpec from './config/swagger';
import './models';
import db from './models';
import { seedIfEmpty } from './seed';

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

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');


    try {
      const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='departments'");
      const departmentsExists = Array.isArray(tables) && tables.length > 0;
      
      if (departmentsExists) {
        await sequelize.sync({ alter: true });
        console.log('数据库模型同步完成（alter模式）');
      } else {
        console.log('检测到空库，跳过alter模式直接使用普通同步');
        await sequelize.sync();
        console.log('数据库模型同步完成（普通模式）');
      }
    } catch (alterError) {
      console.warn('alter模式同步失败，尝试普通同步:', (alterError as Error).message);
      try {
        await sequelize.sync();
        console.log('数据库模型同步完成（普通模式）');
      } catch (syncError) {
        console.warn('普通同步失败，尝试强制重建:', (syncError as Error).message);
        
        if (process.env.NODE_ENV === 'production') {
          throw new Error('生产环境禁止使用force模式同步数据库');
        }
        
        try {
          const dbPath = path.join(process.cwd(), 'hospital.db');
          const backupPath = path.join(process.cwd(), 'hospital.db.backup');
          if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath);
            console.log('数据库备份完成:', backupPath);
          }
        } catch (backupError) {
          console.warn('数据库备份失败，继续执行强制重建:', (backupError as Error).message);
        }
        
        await sequelize.sync({ force: true });
        console.log('数据库模型同步完成（强制重建模式）');
      }
    }



    try {
      await seedIfEmpty();
    } catch (seedError) {
      console.error('种子数据初始化失败:', (seedError as Error).message);
    }


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
