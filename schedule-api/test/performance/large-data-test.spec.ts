import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Employee } from '../../src/employee/entities/employee.entity';
import { Department } from '../../src/department/entities/department.entity';
import { ScheduleEngineService } from '../../src/schedule/engine/schedule-engine.service';
import * as request from 'supertest';

describe('Large Data Performance Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let scheduleEngineService: ScheduleEngineService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    scheduleEngineService = app.get(ScheduleEngineService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Large Dataset Performance', () => {
    beforeEach(async () => {
      // 清理数据
      await dataSource.query('DELETE FROM employee');
      await dataSource.query('DELETE FROM department');
    });

    it('should handle 1000+ employees efficiently', async () => {
      // 创建测试部门
      const departments = [];
      for (let i = 1; i <= 10; i++) {
        departments.push({
          name: `部门${i}`,
          description: `测试部门${i}`
        });
      }
      
      const departmentRepository = dataSource.getRepository(Department);
      const savedDepartments = await departmentRepository.save(departments);

      // 创建1000个员工
      const employees = [];
      const tags = ['医生', '护士', '技师', '管理员', '实习生'];
      const positions = ['主任', '副主任', '主治医师', '住院医师', '护士长', '护士'];
      
      console.time('Create 1000 employees');
      
      for (let i = 1; i <= 1000; i++) {
        employees.push({
          username: `user${i}`,
          employeeNumber: `E${i.toString().padStart(4, '0')}`,
          name: `员工${i}`,
          email: `user${i}@test.com`,
          phone: `1380013${i.toString().padStart(4, '0')}`,
          department: savedDepartments[i % 10].name,
          position: positions[i % positions.length],
          organizationPosition: positions[i % positions.length],
          status: 'AVAILABLE',
          tags: [tags[i % tags.length], tags[(i + 1) % tags.length]],
          level: (i % 5) + 1
        });
      }

      const employeeRepository = dataSource.getRepository(Employee);
      await employeeRepository.save(employees);
      
      console.timeEnd('Create 1000 employees');

      // 测试查询性能
      console.time('Query all employees');
      const allEmployees = await employeeRepository.find();
      console.timeEnd('Query all employees');
      
      expect(allEmployees).toHaveLength(1000);

      // 测试按标签筛选性能
      console.time('Filter employees by tags');
      const doctorEmployees = allEmployees.filter(emp => 
        emp.tags && emp.tags.includes('医生')
      );
      console.timeEnd('Filter employees by tags');
      
      expect(doctorEmployees.length).toBeGreaterThan(0);

      // 测试排班生成性能（小范围）
      console.time('Generate schedule for 7 days');
      
      // 这里需要先创建排班规则，简化测试
      const mockRule = {
        id: 1,
        name: '性能测试规则',
        rotationType: 'DAILY' as const,
        timeConfig: {
          shifts: [{ id: 1, name: '白班', startTime: '08:00', endTime: '18:00' }],
          workDays: [1, 2, 3, 4, 5],
          skipHolidays: false
        },
        roleConfig: {
          roles: [{
            id: 1,
            name: '值班员',
            selectionCriteria: { byTags: ['医生'] },
            assignmentType: 'SINGLE' as const,
            isRequired: true
          }],
          allowEmpty: false
        },
        rotationConfig: {
          mode: 'SEQUENTIAL' as const,
          cycle: 1,
          startDate: new Date()
        },
        constraints: {
          maxConsecutiveDays: 3,
          minRestHours: 12,
          maxWorkHoursPerWeek: 40,
          forbiddenCombinations: []
        }
      };

      // 由于实际的generateSchedule需要数据库中的规则，这里测试人员筛选性能
      const personnelSelector = app.get('PersonnelSelectorService');
      if (personnelSelector) {
        const startTime = Date.now();
        const selectedPersonnel = await personnelSelector.selectPersonnelForRole(
          mockRule.roleConfig.roles[0],
          new Date()
        );
        const endTime = Date.now();
        
        console.log(`Personnel selection took ${endTime - startTime}ms`);
        expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
        expect(selectedPersonnel.length).toBeGreaterThan(0);
      }
      
      console.timeEnd('Generate schedule for 7 days');
    }, 30000); // 30秒超时

    it('should handle concurrent requests efficiently', async () => {
      // 创建100个员工用于并发测试
      const employees = [];
      for (let i = 1; i <= 100; i++) {
        employees.push({
          username: `concurrent_user${i}`,
          employeeNumber: `C${i.toString().padStart(3, '0')}`,
          name: `并发员工${i}`,
          email: `concurrent${i}@test.com`,
          department: '测试部门',
          status: 'AVAILABLE',
          tags: ['测试']
        });
      }

      const employeeRepository = dataSource.getRepository(Employee);
      await employeeRepository.save(employees);

      // 模拟10个并发请求
      const concurrentRequests = [];
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          request(app.getHttpServer())
            .get('/api/employee')
            .expect(200)
        );
      }

      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      console.log(`10 concurrent requests took ${endTime - startTime}ms`);
      
      // 所有请求都应该成功
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(Array.isArray(result.body)).toBe(true);
      });

      // 并发请求应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(5000); // 5秒内
    }, 15000);
  });

  describe('Memory Usage Test', () => {
    it('should not have memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', initialMemory);

      // 创建和删除大量数据
      for (let batch = 0; batch < 5; batch++) {
        const employees = [];
        for (let i = 1; i <= 200; i++) {
          employees.push({
            username: `batch${batch}_user${i}`,
            employeeNumber: `B${batch}${i.toString().padStart(3, '0')}`,
            name: `批次${batch}员工${i}`,
            email: `batch${batch}_${i}@test.com`,
            department: '内存测试部门',
            status: 'AVAILABLE'
          });
        }

        const employeeRepository = dataSource.getRepository(Employee);
        const savedEmployees = await employeeRepository.save(employees);
        
        // 立即删除
        await employeeRepository.remove(savedEmployees);
        
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', finalMemory);

      // 内存增长不应该超过50MB
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
      
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    }, 20000);
  });
});