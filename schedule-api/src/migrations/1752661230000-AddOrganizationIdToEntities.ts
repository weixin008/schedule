import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationIdToEntities1752661230000 implements MigrationInterface {
    name = 'AddOrganizationIdToEntities1752661230000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 为员工表添加organizationId字段（如果不存在）
        await queryRunner.query(`
            ALTER TABLE employee ADD COLUMN organizationId varchar NULL;
        `);

        // 为用户表添加organizationId字段（如果不存在）
        await queryRunner.query(`
            ALTER TABLE user ADD COLUMN organizationId varchar NULL;
        `);

        // 为排班表添加organizationId字段
        await queryRunner.query(`
            ALTER TABLE schedule ADD COLUMN organizationId varchar NULL;
        `);

        // 为分组表添加organizationId字段
        await queryRunner.query(`
            ALTER TABLE "group" ADD COLUMN organizationId varchar NULL;
        `);

        // 为部门表添加organizationId字段
        await queryRunner.query(`
            ALTER TABLE department ADD COLUMN organizationId varchar NULL;
        `);

        // 为岗位表添加organizationId字段
        await queryRunner.query(`
            ALTER TABLE position ADD COLUMN organizationId varchar NULL;
        `);

        // 为现有数据设置默认的organizationId
        await queryRunner.query(`
            UPDATE employee SET organizationId = 'default' WHERE organizationId IS NULL;
        `);

        await queryRunner.query(`
            UPDATE user SET organizationId = 'default' WHERE organizationId IS NULL;
        `);

        await queryRunner.query(`
            UPDATE schedule SET organizationId = 'default' WHERE organizationId IS NULL;
        `);

        await queryRunner.query(`
            UPDATE "group" SET organizationId = 'default' WHERE organizationId IS NULL;
        `);

        await queryRunner.query(`
            UPDATE department SET organizationId = 'default' WHERE organizationId IS NULL;
        `);

        await queryRunner.query(`
            UPDATE position SET organizationId = 'default' WHERE organizationId IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 删除organizationId字段
        await queryRunner.query(`ALTER TABLE employee DROP COLUMN organizationId;`);
        await queryRunner.query(`ALTER TABLE user DROP COLUMN organizationId;`);
        await queryRunner.query(`ALTER TABLE schedule DROP COLUMN organizationId;`);
        await queryRunner.query(`ALTER TABLE "group" DROP COLUMN organizationId;`);
        await queryRunner.query(`ALTER TABLE department DROP COLUMN organizationId;`);
        await queryRunner.query(`ALTER TABLE position DROP COLUMN organizationId;`);
    }
}