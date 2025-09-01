import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as request from 'supertest';

describe('Schedule Workflow E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);

    // 登录获取token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      })
      .expect(201);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Schedule Workflow', () => {
    let departmentId: number;
    let employeeIds: number[] = [];
    let shiftIds: number[] = [];
    let roleIds: number[] = [];
    let ruleId: number;

    it('should create department', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/department')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E测试部门',
          description: '端到端测试部门'
        })
        .expect(201);

      departmentId = response.body.id;
      expect(response.body.name).toBe('E2E测试部门');
    });

    it('should create employees', async () => {
      const employees = [
        {
          username: 'e2e_doctor1',
          name: '测试医生1',
          email: 'doctor1@test.com',
          department: 'E2E测试部门',
          organizationPosition: '主治医师',
          tags: ['医生', '内科'],
          status: 'AVAILABLE'
        },
        {
          username: 'e2e_doctor2',
          name: '测试医生2',
          email: 'doctor2@test.com',
          department: 'E2E测试部门',
          organizationPosition: '住院医师',
          tags: ['医生', '外科'],
          status: 'AVAILABLE'
        },
        {
          username: 'e2e_nurse1',
          name: '测试护士1',
          email: 'nurse1@test.com',
          department: 'E2E测试部门',
          organizationPosition: '护士长',
          tags: ['护士', '内科'],
          status: 'AVAILABLE'
        }
      ];

      for (const employee of employees) {
        const response = await request(app.getHttpServer())
          .post('/api/employee')
          .set('Authorization', `Bearer ${authToken}`)
          .send(employee)
          .expect(201);

        employeeIds.push(response.body.id);
      }

      expect(employeeIds).toHaveLength(3);
    });

    it('should create shifts', async () => {
      const shifts = [
        {
          name: 'E2E早班',
          startTime: '08:00',
          endTime: '16:00',
          description: '早班测试'
        },
        {
          name: 'E2E晚班',
          startTime: '16:00',
          endTime: '24:00',
          description: '晚班测试'
        }
      ];

      for (const shift of shifts) {
        const response = await request(app.getHttpServer())
          .post('/api/shift')
          .set('Authorization', `Bearer ${authToken}`)
          .send(shift)
          .expect(201);

        shiftIds.push(response.body.id);
        expect(response.body.type).toBeDefined(); // 应该自动识别班次类型
      }

      expect(shiftIds).toHaveLength(2);
    });

    it('should create shift roles', async () => {
      const roles = [
        {
          name: 'E2E值班医生',
          selectionCriteria: {
            byTags: ['医生'],
            byDepartment: ['E2E测试部门'],
            byPosition: []
          },
          assignmentType: 'SINGLE',
          isRequired: true,
          description: '值班医生角色'
        },
        {
          name: 'E2E值班护士',
          selectionCriteria: {
            byTags: ['护士'],
            byDepartment: ['E2E测试部门'],
            byPosition: []
          },
          assignmentType: 'SINGLE',
          isRequired: true,
          description: '值班护士角色'
        }
      ];

      for (const role of roles) {
        const response = await request(app.getHttpServer())
          .post('/api/shift-role')
          .set('Authorization', `Bearer ${authToken}`)
          .send(role)
          .expect(201);

        roleIds.push(response.body.id);
      }

      expect(roleIds).toHaveLength(2);
    });

    it('should create schedule rule', async () => {
      // 获取创建的班次和角色
      const shiftsResponse = await request(app.getHttpServer())
        .get('/api/shift')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const rolesResponse = await request(app.getHttpServer())
        .get('/api/shift-role')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const e2eShifts = shiftsResponse.body.filter(s => s.name.startsWith('E2E'));
      const e2eRoles = rolesResponse.body.filter(r => r.name.startsWith('E2E'));

      const ruleData = {
        name: 'E2E测试规则',
        description: '端到端测试排班规则',
        rotationType: 'DAILY',
        timeConfig: {
          shifts: e2eShifts,
          workDays: [1, 2, 3, 4, 5], // 工作日
          skipHolidays: false
        },
        roleConfig: {
          roles: e2eRoles,
          allowEmpty: false
        },
        rotationConfig: {
          mode: 'SEQUENTIAL',
          cycle: 1,
          startDate: new Date().toISOString()
        },
        constraints: {
          maxConsecutiveDays: 3,
          minRestHours: 12,
          maxWorkHoursPerWeek: 40,
          forbiddenCombinations: []
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/schedule-rule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData)
        .expect(201);

      ruleId = response.body.id;
      expect(response.body.name).toBe('E2E测试规则');
    });

    it('should preview schedule rule', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      const response = await request(app.getHttpServer())
        .post('/api/schedule-engine/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ruleId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          sampleDays: 7
        })
        .expect(201);

      expect(response.body.rule).toBeDefined();
      expect(response.body.preview).toBeDefined();
      expect(response.body.preview.schedules).toBeDefined();
      expect(response.body.preview.statistics).toBeDefined();
    });

    it('should generate schedule', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 5); // 5个工作日

      const response = await request(app.getHttpServer())
        .post('/api/schedule-engine/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ruleId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          forceRegenerate: true
        })
        .expect(201);

      expect(response.body.schedules).toBeDefined();
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.totalDays).toBeGreaterThan(0);
      expect(response.body.statistics.scheduledDays).toBeGreaterThan(0);
      
      // 验证生成的排班数据
      const schedules = response.body.schedules;
      expect(schedules.length).toBeGreaterThan(0);
      
      // 每个排班都应该有分配的人员
      schedules.forEach(schedule => {
        expect(schedule.assignedPersonId || schedule.assignedGroupId).toBeDefined();
      });
    });

    it('should detect conflicts', async () => {
      // 创建一个冲突的排班数据进行测试
      const conflictSchedules = [
        {
          date: new Date().toISOString().split('T')[0],
          shiftId: shiftIds[0],
          roleId: roleIds[0],
          assignedPersonId: employeeIds[0],
          assignmentType: 'SINGLE',
          status: 'NORMAL'
        },
        {
          date: new Date().toISOString().split('T')[0],
          shiftId: shiftIds[1], // 同一天不同班次
          roleId: roleIds[1],
          assignedPersonId: employeeIds[0], // 同一个人
          assignmentType: 'SINGLE',
          status: 'NORMAL'
        }
      ];

      const response = await request(app.getHttpServer())
        .post('/api/schedule-engine/detect-conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          schedules: conflictSchedules
        })
        .expect(201);

      expect(response.body.hasConflicts).toBeDefined();
      expect(response.body.conflicts).toBeDefined();
      expect(response.body.summary).toBeDefined();
    });

    it('should get personnel selection for role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/schedule-engine/personnel-selection')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roleId: roleIds[0], // 医生角色
          date: new Date().toISOString().split('T')[0]
        })
        .expect(201);

      expect(response.body.availablePersonnel).toBeDefined();
      expect(response.body.unavailablePersonnel).toBeDefined();
      expect(response.body.selectionCriteria).toBeDefined();
      
      // 应该能找到医生
      expect(response.body.availablePersonnel.length).toBeGreaterThan(0);
    });

    it('should get engine status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/schedule-engine/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('active');
      expect(response.body.features).toBeDefined();
      expect(response.body.supportedRotationTypes).toBeDefined();
      expect(response.body.supportedAssignmentTypes).toBeDefined();
    });

    // 清理测试数据
    afterAll(async () => {
      // 删除创建的测试数据
      if (employeeIds.length > 0) {
        for (const id of employeeIds) {
          await request(app.getHttpServer())
            .delete(`/api/employee/${id}`)
            .set('Authorization', `Bearer ${authToken}`);
        }
      }

      if (departmentId) {
        await request(app.getHttpServer())
          .delete(`/api/department/${departmentId}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    });
  });
});