import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmployeeModule } from './employee/employee.module';
import { DepartmentModule } from './department/department.module';
import { PositionModule } from './position/position.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ScheduleRuleModule } from './schedule-rule/schedule-rule.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { StatsModule } from './stats/stats.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ExcelModule } from './excel/excel.module';
import { GroupModule } from './group/group.module';
import { ShiftModule } from './shift/shift.module';
import { ShiftRoleModule } from './shift-role/shift-role.module';
import { ScheduleEngineModule } from './schedule/engine/schedule-engine.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'db.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    }),
    AuthModule,
    UserModule,
    EmployeeModule,
    DepartmentModule,
    PositionModule,
    ScheduleModule,
    ScheduleRuleModule,
    SystemSettingsModule,
    StatsModule,
    ExcelModule,
    GroupModule,
    ShiftModule,
    ShiftRoleModule,
    ScheduleEngineModule,
    OrganizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
