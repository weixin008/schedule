import { DataSource } from "typeorm";
import { Schedule } from "./schedule/entities/schedule.entity";
import { Employee } from "./employee/entities/employee.entity";
import { Department } from "./department/entities/department.entity";
import { Position } from "./position/entities/position.entity";
import { User } from "./user/entities/user.entity";
import { ScheduleRule } from "./schedule-rule/entities/schedule-rule.entity";
import { Group } from "./group/entities/group.entity";
import { EmployeeGroup } from "./group/entities/employee-group.entity";

export default new DataSource({
  type: "sqlite",
  database: "db.sqlite",
  entities: [
    Schedule,
    Employee,
    Department,
    Position,
    User,
    ScheduleRule,
    Group,
    EmployeeGroup
  ],
  synchronize: true,
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations"
});