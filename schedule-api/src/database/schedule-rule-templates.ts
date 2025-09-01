import { DataSource } from 'typeorm';
import { ScheduleRule } from '../schedule-rule/entities/schedule-rule.entity';
import { Shift } from '../shift/entities/shift.entity';
import { ShiftRole } from '../shift-role/entities/shift-role.entity';

export async function seedScheduleRuleTemplates(dataSource: DataSource) {
  const scheduleRuleRepository = dataSource.getRepository(ScheduleRule);
  const shiftRepository = dataSource.getRepository(Shift);
  const shiftRoleRepository = dataSource.getRepository(ShiftRole);

  // 创建基础班次
  const shifts = [
    { name: '早班', startTime: '08:00', endTime: '16:00', type: '早班', isOvernight: false },
    { name: '晚班', startTime: '16:00', endTime: '24:00', type: '晚班', isOvernight: false },
    { name: '夜班', startTime: '00:00', endTime: '08:00', type: '夜班', isOvernight: true },
    { name: '全天', startTime: '00:00', endTime: '24:00', type: '白班', isOvernight: false },
  ];

  for (const shiftData of shifts) {
    const existingShift = await shiftRepository.findOne({ where: { name: shiftData.name } });
    if (!existingShift) {
      const shift = shiftRepository.create(shiftData);
      await shiftRepository.save(shift);
    }
  }

  // 不再创建默认的值班角色，由用户根据实际需求自行创建
    // 获取创建的班次和现有角色
  const allShifts = await shiftRepository.find();
  const allRoles = await shiftRoleRepository.find();

  // 暂时不创建排班规则模板，因为没有默认角色
  // 用户可以在配置好角色后，根据需要创建排班规则
  }