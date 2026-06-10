import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '医院预约排班管理系统 API',
      version: '1.0.0',
      description: '基于 Express 4 + TypeScript + Sequelize + SQLite 实现的医院预约排班管理系统',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '开发环境',
      },
    ],
    components: {
      schemas: {
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '排班ID' },
            doctorId: { type: 'string', description: '医生ID' },
            date: { type: 'string', format: 'date', description: '出诊日期' },
            startTime: { type: 'string', description: '开始时间' },
            endTime: { type: 'string', description: '结束时间' },
            timeSlot: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: '时段' },
            appointmentType: { type: 'string', enum: ['normal', 'expert', 'special'], description: '号别' },
            capacity: { type: 'integer', description: '号源数量' },
            repeatType: { type: 'string', enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly'], description: '重复类型' },
            repeatEndDate: { type: 'string', format: 'date', description: '重复结束日期' },
            repeatWeekdays: { type: 'string', description: '重复星期（1-5）' },
            isCancelled: { type: 'boolean', description: '是否取消' },
            cancelReason: { type: 'string', description: '取消原因' },
          },
        },
        Slot: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '号源ID' },
            scheduleId: { type: 'string', description: '排班ID' },
            doctorId: { type: 'string', description: '医生ID' },
            date: { type: 'string', format: 'date', description: '日期' },
            timeSlot: { type: 'string', description: '时段' },
            appointmentType: { type: 'string', description: '号别' },
            slotNumber: { type: 'integer', description: '序号' },
            startTime: { type: 'string', description: '开始时间' },
            endTime: { type: 'string', description: '结束时间' },
            status: { type: 'string', enum: ['available', 'booked', 'cancelled'], description: '状态' },
            price: { type: 'number', description: '价格' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '预约ID' },
            appointmentNo: { type: 'string', description: '预约号' },
            patientId: { type: 'string', description: '患者ID' },
            slotId: { type: 'string', description: '号源ID' },
            queueNumber: { type: 'integer', description: '排队序号' },
            status: { type: 'string', description: '状态' },
            symptoms: { type: 'string', description: '症状描述' },
          },
        },
      },
    },
    tags: [
      { name: '排班管理', description: '医生排班相关接口' },
      { name: '号源管理', description: '号源查询相关接口' },
      { name: '预约管理', description: '患者预约相关接口' },
      { name: '叫号系统', description: '叫号相关接口' },
      { name: '统计分析', description: '统计报表相关接口' },
      { name: '黑名单管理', description: '黑名单相关接口' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
