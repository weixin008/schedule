import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeScheduleSystem1752661200000 implements MigrationInterface {
  name = 'OptimizeScheduleSystem1752661200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 shift 表
    await queryRunner.query(`
      CREATE TABLE "shift" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(100) NOT NULL,
        "startTime" varchar(5) NOT NULL,
        "endTime" varchar(5) NOT NULL,
        "isOvernight" boolean NOT NULL DEFAULT (0),
        "type" varchar(50) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT (1),
        "description" text,
        "sortOrder" integer NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 创建 shift_role 表
    await queryRunner.query(`
      CREATE TABLE "shift_role" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(100) NOT NULL,
        "selectionCriteria" text NOT NULL,
        "assignmentType" varchar CHECK("assignmentType" IN ('SINGLE','GROUP')) NOT NULL DEFAULT ('SINGLE'),
        "isRequired" boolean NOT NULL DEFAULT (1),
        "description" text,
        "isActive" boolean NOT NULL DEFAULT (1),
        "sortOrder" integer NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 为 employee 表添加新字段
    await queryRunner.query(`
      ALTER TABLE "employee" ADD COLUMN "organizationPosition" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "employee" ADD COLUMN "statusPeriod" text
    `);

    // 更新 employee 表的 status 字段（注意：SQLite 不支持直接修改枚举，需要重建表）
    // 这里我们先添加新的状态字段，然后在应用层处理迁移
    await queryRunner.query(`
      ALTER TABLE "employee" ADD COLUMN "newStatus" varchar CHECK("newStatus" IN ('AVAILABLE','LEAVE','BUSINESS_TRIP')) DEFAULT ('AVAILABLE')
    `);

    // 迁移现有状态数据
    await queryRunner.query(`
      UPDATE "employee" SET "newStatus" = 
        CASE 
          WHEN "status" = '在岗' THEN 'AVAILABLE'
          WHEN "status" = '请假' THEN 'LEAVE'
          WHEN "status" = '出差' THEN 'BUSINESS_TRIP'
          ELSE 'AVAILABLE'
        END
    `);

    // 为 group 表添加新字段
    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "type" varchar CHECK("type" IN ('FIXED_PAIR','ROTATION_GROUP')) DEFAULT ('FIXED_PAIR')
    `);

    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "memberIds" text
    `);

    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "applicableRoles" text
    `);

    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "rotationOrder" text
    `);

    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "isActive" boolean NOT NULL DEFAULT (1)
    `);

    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
    `);

    await queryRunner.query(`
      ALTER TABLE "group" ADD COLUMN "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
    `);

    // 更新 schedule_rule 表结构
    // 由于结构变化较大，我们创建新表并迁移数据
    await queryRunner.query(`
      CREATE TABLE "schedule_rule_new" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "rotationType" varchar CHECK("rotationType" IN ('DAILY','WEEKLY','MONTHLY','CONTINUOUS','SHIFT_BASED')) NOT NULL DEFAULT ('DAILY'),
        "timeConfig" text NOT NULL,
        "roleConfig" text NOT NULL,
        "rotationConfig" text NOT NULL,
        "constraints" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT (1),
        "sortOrder" integer NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 为 schedule 表添加新字段
    await queryRunner.query(`
      ALTER TABLE "schedule" ADD COLUMN "shiftId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule" ADD COLUMN "roleId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule" ADD COLUMN "assignedPersonId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule" ADD COLUMN "assignedGroupId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "schedule" ADD COLUMN "assignmentType" varchar CHECK("assignmentType" IN ('SINGLE','GROUP')) DEFAULT ('SINGLE')
    `);

    // 更新 schedule 表的 status 字段
    await queryRunner.query(`
      ALTER TABLE "schedule" ADD COLUMN "newStatus" varchar CHECK("newStatus" IN ('NORMAL','CONFLICT','EMPTY')) DEFAULT ('NORMAL')
    `);

    // 插入一些默认的班次数据
    await queryRunner.query(`
      INSERT INTO "shift" ("name", "startTime", "endTime", "type", "isOvernight", "sortOrder") VALUES
      ('白班', '08:00', '16:00', '白班', 0, 1),
      ('晚班', '16:00', '24:00', '晚班', 0, 2),
      ('夜班', '00:00', '08:00', '夜班', 0, 3)
    `);

    // 不再插入默认的值班角色数据，由用户根据实际需求创建
    // 用户可以通过值班角色配置页面添加需要的角色
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚操作
    await queryRunner.query(`DROP TABLE "shift"`);
    await queryRunner.query(`DROP TABLE "shift_role"`);
    await queryRunner.query(`DROP TABLE "schedule_rule_new"`);
    
    // 移除添加的字段
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "organizationPosition"`);
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "statusPeriod"`);
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "newStatus"`);
    
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "memberIds"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "applicableRoles"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "rotationOrder"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "group" DROP COLUMN "updatedAt"`);
    
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "shiftId"`);
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "roleId"`);
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "assignedPersonId"`);
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "assignedGroupId"`);
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "assignmentType"`);
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "newStatus"`);
  }
}