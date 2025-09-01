import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEmployeeStatus1752661210000 implements MigrationInterface {
    name = 'UpdateEmployeeStatus1752661210000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 添加新的状态时间段字段
        await queryRunner.query(`ALTER TABLE "employee" ADD "statusStartDate" date`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "statusEndDate" date`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "isLongTerm" boolean DEFAULT 0`);
        
        // 更新现有的状态值
        await queryRunner.query(`UPDATE "employee" SET "status" = 'ON_DUTY' WHERE "status" = 'AVAILABLE'`);
        
        // 删除不再需要的字段
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "statusPeriod"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 恢复原来的字段
        await queryRunner.query(`ALTER TABLE "employee" ADD "statusPeriod" text`);
        
        // 恢复原来的状态值
        await queryRunner.query(`UPDATE "employee" SET "status" = 'AVAILABLE' WHERE "status" = 'ON_DUTY'`);
        
        // 删除新添加的字段
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "statusStartDate"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "statusEndDate"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "isLongTerm"`);
    }
}