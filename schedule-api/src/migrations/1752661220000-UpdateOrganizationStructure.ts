import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrganizationStructure1752661220000 implements MigrationInterface {
    name = 'UpdateOrganizationStructure1752661220000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 更新部门表结构
        await queryRunner.query(`ALTER TABLE "department" ADD "parentId" integer`);
        await queryRunner.query(`ALTER TABLE "department" ADD "level" integer DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "department" ADD "sortOrder" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "manager"`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "employeeCount"`);

        // 更新职位表结构
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "department"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "color"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "requiredTags"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "enableGrouping"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "groupSize"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "constraints"`);
        
        await queryRunner.query(`ALTER TABLE "position" ADD "departmentId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "position" ADD "level" integer DEFAULT 5`);
        await queryRunner.query(`ALTER TABLE "position" ADD "maxCount" integer DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "position" ADD "currentCount" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "position" ADD "sortOrder" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "position" ADD "status" varchar DEFAULT 'active'`);

        // 删除employee_position关联表（如果存在）
        await queryRunner.query(`DROP TABLE IF EXISTS "employee_position"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 恢复部门表结构
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "parentId"`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "level"`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "department" ADD "manager" varchar`);
        await queryRunner.query(`ALTER TABLE "department" ADD "employeeCount" integer DEFAULT 0`);

        // 恢复职位表结构
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "departmentId"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "level"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "maxCount"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "currentCount"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "position" DROP COLUMN "status"`);
        
        await queryRunner.query(`ALTER TABLE "position" ADD "department" varchar`);
        await queryRunner.query(`ALTER TABLE "position" ADD "priority" integer DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "position" ADD "color" varchar DEFAULT '#1890ff'`);
        await queryRunner.query(`ALTER TABLE "position" ADD "requiredTags" text`);
        await queryRunner.query(`ALTER TABLE "position" ADD "enableGrouping" boolean DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "position" ADD "groupSize" integer`);
        await queryRunner.query(`ALTER TABLE "position" ADD "constraints" text`);
    }
}