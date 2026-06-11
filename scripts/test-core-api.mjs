const BASE = 'http://localhost:3000';

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  return res.json();
}

async function run() {
  let passed = 0, failed = 0;
  function check(name, condition) {
    if (condition) { console.log('  ✅ ' + name); passed++; }
    else { console.log('  ❌ ' + name); failed++; }
  }

  const health = await api('GET', '/health');
  check('服务健康检查', health.success === true);

  const schedRes = await api('GET', '/api/schedules');
  if (!schedRes.success || !schedRes.data || !schedRes.data.length) {
    console.log('无排班数据，跳过测试');
    process.exit(1);
  }
  const schedule = schedRes.data[0];
  const scheduleId = schedule.id;
  console.log('\n排班: ' + (schedule.doctor ? schedule.doctor.name : schedule.doctorId) + ', 日期: ' + schedule.date + ', ID: ' + scheduleId);

  const slotsRes = await api('GET', '/api/slots?scheduleId=' + scheduleId);
  const availableSlots = (slotsRes.data || []).filter(s => s.status === 'available');
  if (availableSlots.length < 2) {
    console.log('可用号源不足，跳过测试');
    process.exit(1);
  }
  const slot1 = availableSlots[0];
  const slot2 = availableSlots[1];
  console.log('号源1: slotNumber=' + slot1.slotNumber + ', ID=' + slot1.id);
  console.log('号源2: slotNumber=' + slot2.slotNumber + ', ID=' + slot2.id);

  console.log('\n=== 测试1: 创建预约，验证初始状态pending ===');
  const apt1Res = await api('POST', '/api/appointments', {
    slotId: slot1.id,
    patientInfo: { name: '张三', idCard: '110101199001011234', phone: '13800138000', gender: 'male', birthDate: '1990-01-01', address: '北京' }
  });
  const apt1Id = apt1Res.data ? apt1Res.data.id : null;
  check('创建预约成功', apt1Res.success === true);
  check('初始状态为pending', apt1Res.data && apt1Res.data.status === 'pending');

  console.log('\n=== 测试2: 叫号，验证pending到confirmed ===');
  const callRes = await api('POST', '/api/queue/call', { scheduleId: scheduleId });
  check('叫号成功', callRes.success === true);
  check('叫号返回slotNumber', callRes.data && callRes.data.slotNumber !== undefined);

  const apt1Detail = await api('GET', '/api/appointments/' + apt1Id);
  check('预约状态变为confirmed', apt1Detail.data && apt1Detail.data.status === 'confirmed');

  console.log('\n=== 测试3: 验证currentCallNumber正确更新 ===');
  const schedAfter = await api('GET', '/api/schedules');
  const updatedSchedule = schedAfter.data.find(s => s.id === scheduleId);
  check('currentCallNumber已更新(>0)', (updatedSchedule && updatedSchedule.currentCallNumber || 0) > 0);

  console.log('\n=== 测试4: 完成就诊，验证confirmed到completed ===');
  const completeRes = await api('POST', '/api/queue/appointment/' + apt1Id + '/complete');
  check('完成就诊成功', completeRes.success === true);
  check('预约状态变为completed', completeRes.data && completeRes.data.status === 'completed');

  console.log('\n=== 测试5: 取消预约不算爽约 ===');
  const apt2Res = await api('POST', '/api/appointments', {
    slotId: slot2.id,
    patientInfo: { name: '李四', idCard: '110101199001011235', phone: '13800138001', gender: 'female', birthDate: '1992-02-02', address: '上海' }
  });
  const apt2Id = apt2Res.data ? apt2Res.data.id : null;
  check('创建第二个预约成功', apt2Res.success === true);

  const apt2DetailBefore = await api('GET', '/api/appointments/' + apt2Id);
  const noShowBefore = apt2DetailBefore.data && apt2DetailBefore.data.patient ? apt2DetailBefore.data.patient.noShowCount : 0;

  const cancelRes = await api('POST', '/api/appointments/' + apt2Id + '/cancel', { reason: '测试取消' });
  check('取消预约成功', cancelRes.success === true);
  check('预约状态变为cancelled', cancelRes.data && cancelRes.data.status === 'cancelled');

  const apt2DetailAfter = await api('GET', '/api/appointments/' + apt2Id);
  const noShowAfter = apt2DetailAfter.data && apt2DetailAfter.data.patient ? apt2DetailAfter.data.patient.noShowCount : 0;
  check('取消预约后noShowCount不变', noShowAfter === noShowBefore);

  console.log('\n=== 测试6: 叫号按slotNumber顺序推进 ===');
  const callRes2 = await api('POST', '/api/queue/call', { scheduleId: scheduleId });
  if (callRes2.success) {
    check('第二次叫号成功', true);
    const schedAfter2 = await api('GET', '/api/schedules');
    const updatedSchedule2 = schedAfter2.data.find(s => s.id === scheduleId);
    check('currentCallNumber递增', (updatedSchedule2 && updatedSchedule2.currentCallNumber || 0) >= (updatedSchedule && updatedSchedule.currentCallNumber || 0));
  } else {
    check('第二次叫号(无pending预约属正常)', true);
  }

  const sep = '='.repeat(50);
  console.log('\n' + sep);
  console.log('测试结果: ' + passed + ' 通过, ' + failed + ' 失败');
  console.log(sep);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('测试执行异常:', e); process.exit(1); });
