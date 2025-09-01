import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroups1752661191581 implements MigrationInterface {
    name = 'AddGroups1752661191581'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "name" varchar NOT NULL, "email" varchar, "phone" varchar, "departmentId" integer, "positionId" integer, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "statusPeriod" json, "tags" text, "level" varchar, "remarks" text, "joinDate" datetime NOT NULL, "userId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_389fe2fe09430efb8eabc4e1b6e" UNIQUE ("username"))`);
        await queryRunner.query(`INSERT INTO "temporary_employee"("id", "username", "name", "email", "phone", "departmentId", "positionId", "status", "statusPeriod", "tags", "level", "remarks", "joinDate", "userId", "createdAt", "updatedAt") SELECT "id", "username", "name", "email", "phone", "departmentId", "positionId", "status", "statusPeriod", "tags", "level", "remarks", "joinDate", "userId", "createdAt", "updatedAt" FROM "employee"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee" RENAME TO "employee"`);
        await queryRunner.query(`CREATE TABLE "group" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(100) NOT NULL, "description" text)`);
        await queryRunner.query(`CREATE TABLE "employee_group" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "employeeId" integer, "groupId" integer)`);
        await queryRunner.query(`CREATE TABLE "employee_positions_position" ("employeeId" integer NOT NULL, "positionId" integer NOT NULL, PRIMARY KEY ("employeeId", "positionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1835841c824f81fc939a3f2bf9" ON "employee_positions_position" ("employeeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ec24b0e3f6cc6fe8cc05d28925" ON "employee_positions_position" ("positionId") `);
        await queryRunner.query(`CREATE TABLE "temporary_employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_employee"("id", "name", "status", "createdAt", "updatedAt") SELECT "id", "name", "status", "createdAt", "updatedAt" FROM "employee"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee" RENAME TO "employee"`);
        await queryRunner.query(`CREATE TABLE "temporary_employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "contactDetails" json, "department_id" integer)`);
        await queryRunner.query(`INSERT INTO "temporary_employee"("id", "name", "status", "createdAt", "updatedAt") SELECT "id", "name", "status", "createdAt", "updatedAt" FROM "employee"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee" RENAME TO "employee"`);
        await queryRunner.query(`CREATE TABLE "temporary_schedule" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar NOT NULL, "start" datetime NOT NULL, "end" datetime NOT NULL, "employeeId" integer NOT NULL, "date" datetime NOT NULL, "shift" varchar NOT NULL, "startTime" varchar NOT NULL, "endTime" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('pending'), "notes" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "replacementHistory" json, "positionId" integer NOT NULL, "replacementEmployeeId" integer, "replacementReason" text, CONSTRAINT "FK_b81737400cce9875401177fd48b" FOREIGN KEY ("employeeId") REFERENCES "employee" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_schedule"("id", "title", "start", "end", "employeeId", "date", "shift", "startTime", "endTime", "status", "notes", "createdAt", "updatedAt", "replacementHistory", "positionId") SELECT "id", "title", "start", "end", "employeeId", "date", "shift", "startTime", "endTime", "status", "notes", "createdAt", "updatedAt", "replacementHistory", "positionId" FROM "schedule"`);
        await queryRunner.query(`DROP TABLE "schedule"`);
        await queryRunner.query(`ALTER TABLE "temporary_schedule" RENAME TO "schedule"`);
        await queryRunner.query(`CREATE TABLE "temporary_employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(50) NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "contactDetails" json, "department_id" integer)`);
        await queryRunner.query(`INSERT INTO "temporary_employee"("id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id") SELECT "id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id" FROM "employee"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee" RENAME TO "employee"`);
        await queryRunner.query(`CREATE TABLE "temporary_employee_group" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "employeeId" integer, "groupId" integer, CONSTRAINT "FK_e89208808cfeb96584b1f88be52" FOREIGN KEY ("employeeId") REFERENCES "employee" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_cc7f5775c92bd05277760a072de" FOREIGN KEY ("groupId") REFERENCES "group" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_employee_group"("id", "employeeId", "groupId") SELECT "id", "employeeId", "groupId" FROM "employee_group"`);
        await queryRunner.query(`DROP TABLE "employee_group"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee_group" RENAME TO "employee_group"`);
        await queryRunner.query(`CREATE TABLE "temporary_employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(50) NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "contactDetails" json, "department_id" integer, CONSTRAINT "FK_d62835db8c0aec1d18a5a927549" FOREIGN KEY ("department_id") REFERENCES "department" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_employee"("id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id") SELECT "id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id" FROM "employee"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee" RENAME TO "employee"`);
        await queryRunner.query(`DROP INDEX "IDX_1835841c824f81fc939a3f2bf9"`);
        await queryRunner.query(`DROP INDEX "IDX_ec24b0e3f6cc6fe8cc05d28925"`);
        await queryRunner.query(`CREATE TABLE "temporary_employee_positions_position" ("employeeId" integer NOT NULL, "positionId" integer NOT NULL, CONSTRAINT "FK_1835841c824f81fc939a3f2bf95" FOREIGN KEY ("employeeId") REFERENCES "employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_ec24b0e3f6cc6fe8cc05d289255" FOREIGN KEY ("positionId") REFERENCES "position" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("employeeId", "positionId"))`);
        await queryRunner.query(`INSERT INTO "temporary_employee_positions_position"("employeeId", "positionId") SELECT "employeeId", "positionId" FROM "employee_positions_position"`);
        await queryRunner.query(`DROP TABLE "employee_positions_position"`);
        await queryRunner.query(`ALTER TABLE "temporary_employee_positions_position" RENAME TO "employee_positions_position"`);
        await queryRunner.query(`CREATE INDEX "IDX_1835841c824f81fc939a3f2bf9" ON "employee_positions_position" ("employeeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ec24b0e3f6cc6fe8cc05d28925" ON "employee_positions_position" ("positionId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_ec24b0e3f6cc6fe8cc05d28925"`);
        await queryRunner.query(`DROP INDEX "IDX_1835841c824f81fc939a3f2bf9"`);
        await queryRunner.query(`ALTER TABLE "employee_positions_position" RENAME TO "temporary_employee_positions_position"`);
        await queryRunner.query(`CREATE TABLE "employee_positions_position" ("employeeId" integer NOT NULL, "positionId" integer NOT NULL, PRIMARY KEY ("employeeId", "positionId"))`);
        await queryRunner.query(`INSERT INTO "employee_positions_position"("employeeId", "positionId") SELECT "employeeId", "positionId" FROM "temporary_employee_positions_position"`);
        await queryRunner.query(`DROP TABLE "temporary_employee_positions_position"`);
        await queryRunner.query(`CREATE INDEX "IDX_ec24b0e3f6cc6fe8cc05d28925" ON "employee_positions_position" ("positionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1835841c824f81fc939a3f2bf9" ON "employee_positions_position" ("employeeId") `);
        await queryRunner.query(`ALTER TABLE "employee" RENAME TO "temporary_employee"`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(50) NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "contactDetails" json, "department_id" integer)`);
        await queryRunner.query(`INSERT INTO "employee"("id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id") SELECT "id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id" FROM "temporary_employee"`);
        await queryRunner.query(`DROP TABLE "temporary_employee"`);
        await queryRunner.query(`ALTER TABLE "employee_group" RENAME TO "temporary_employee_group"`);
        await queryRunner.query(`CREATE TABLE "employee_group" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "employeeId" integer, "groupId" integer)`);
        await queryRunner.query(`INSERT INTO "employee_group"("id", "employeeId", "groupId") SELECT "id", "employeeId", "groupId" FROM "temporary_employee_group"`);
        await queryRunner.query(`DROP TABLE "temporary_employee_group"`);
        await queryRunner.query(`ALTER TABLE "employee" RENAME TO "temporary_employee"`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "contactDetails" json, "department_id" integer)`);
        await queryRunner.query(`INSERT INTO "employee"("id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id") SELECT "id", "name", "status", "createdAt", "updatedAt", "contactDetails", "department_id" FROM "temporary_employee"`);
        await queryRunner.query(`DROP TABLE "temporary_employee"`);
        await queryRunner.query(`ALTER TABLE "schedule" RENAME TO "temporary_schedule"`);
        await queryRunner.query(`CREATE TABLE "schedule" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar NOT NULL, "start" datetime NOT NULL, "end" datetime NOT NULL, "employeeId" integer NOT NULL, "date" datetime NOT NULL, "shift" varchar NOT NULL, "startTime" varchar NOT NULL, "endTime" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('pending'), "notes" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "replacementHistory" json, "positionId" integer NOT NULL, CONSTRAINT "FK_b81737400cce9875401177fd48b" FOREIGN KEY ("employeeId") REFERENCES "employee" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "schedule"("id", "title", "start", "end", "employeeId", "date", "shift", "startTime", "endTime", "status", "notes", "createdAt", "updatedAt", "replacementHistory", "positionId") SELECT "id", "title", "start", "end", "employeeId", "date", "shift", "startTime", "endTime", "status", "notes", "createdAt", "updatedAt", "replacementHistory", "positionId" FROM "temporary_schedule"`);
        await queryRunner.query(`DROP TABLE "temporary_schedule"`);
        await queryRunner.query(`ALTER TABLE "employee" RENAME TO "temporary_employee"`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "employee"("id", "name", "status", "createdAt", "updatedAt") SELECT "id", "name", "status", "createdAt", "updatedAt" FROM "temporary_employee"`);
        await queryRunner.query(`DROP TABLE "temporary_employee"`);
        await queryRunner.query(`ALTER TABLE "employee" RENAME TO "temporary_employee"`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "name" varchar NOT NULL, "email" varchar, "phone" varchar, "departmentId" integer, "positionId" integer, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "statusPeriod" json, "tags" text, "level" varchar, "remarks" text, "joinDate" datetime NOT NULL, "userId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_389fe2fe09430efb8eabc4e1b6e" UNIQUE ("username"))`);
        await queryRunner.query(`INSERT INTO "employee"("id", "name", "status", "createdAt", "updatedAt") SELECT "id", "name", "status", "createdAt", "updatedAt" FROM "temporary_employee"`);
        await queryRunner.query(`DROP TABLE "temporary_employee"`);
        await queryRunner.query(`DROP INDEX "IDX_ec24b0e3f6cc6fe8cc05d28925"`);
        await queryRunner.query(`DROP INDEX "IDX_1835841c824f81fc939a3f2bf9"`);
        await queryRunner.query(`DROP TABLE "employee_positions_position"`);
        await queryRunner.query(`DROP TABLE "employee_group"`);
        await queryRunner.query(`DROP TABLE "group"`);
        await queryRunner.query(`ALTER TABLE "employee" RENAME TO "temporary_employee"`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "name" varchar NOT NULL, "email" varchar, "phone" varchar, "departmentId" integer, "positionId" integer, "status" varchar(20) NOT NULL DEFAULT ('在岗'), "statusPeriod" json, "tags" text, "level" varchar, "remarks" text, "joinDate" datetime NOT NULL, "userId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_389fe2fe09430efb8eabc4e1b6e" UNIQUE ("username"), CONSTRAINT "FK_f4b0d329c4a3cf79ffe9d565047" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_9ad20e4029f9458b6eed0b0c454" FOREIGN KEY ("departmentId") REFERENCES "department" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "employee"("id", "username", "name", "email", "phone", "departmentId", "positionId", "status", "statusPeriod", "tags", "level", "remarks", "joinDate", "userId", "createdAt", "updatedAt") SELECT "id", "username", "name", "email", "phone", "departmentId", "positionId", "status", "statusPeriod", "tags", "level", "remarks", "joinDate", "userId", "createdAt", "updatedAt" FROM "temporary_employee"`);
        await queryRunner.query(`DROP TABLE "temporary_employee"`);
    }

}
