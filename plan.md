# 通用排班工具系统优化整合方案

## 系统定位与核心理念

**系统定位**：通用排班工具 - 通过灵活配置满足各行业、各场景的排班需求
**核心理念**：配置驱动，规则引擎，智能辅助，简化操作

### 排班场景全覆盖
- **轮换模式**：每日轮换、每周轮换、每月轮换
- **班次类型**：早晚班、白夜班、三班倒、连班制
- **人员配置**：单人值班、双人值班、编组值班、分层值班
- **特殊规则**：节假日特殊安排、紧急替班、资质要求

## 一、现有项目功能整合优化

### 1. 概念统一与逻辑梳理

**解决概念冲突**：
```typescript
// 值班角色（排班时使用）
interface ShiftRole {
  id: number;
  name: string;           // 值班角色：领导岗、值班员岗、安全员岗
  description: string;    // 职责描述
  requiredTags: string[]; // 人员要求标签
  isLeaderRole: boolean;  // 是否领导岗
  priority: number;       // 优先级
}

// 组织岗位（人员管理使用）
interface OrganizationPosition {
  id: number;
  name: string;           // 组织岗位：院长、科主任、医生、护士
  department: string;     // 所属部门
  level: number;          // 职级
}

// 人员既有组织岗位，也可胜任多个值班角色
interface Employee {
  id: number;
  name: string;
  organizationPosition: OrganizationPosition;  // 组织岗位
  availableShiftRoles: ShiftRole[];           // 可胜任的值班角色
  tags: string[];                             // 能力标签
  status: 'AVAILABLE' | 'LEAVE' | 'BUSINESS_TRIP'; // 当前状态
}
```

### 2. 排班规则引擎设计

**通用排班规则配置**：
```typescript
interface ScheduleRule {
  id: number;
  name: string;
  ruleType: 'DAILY_ROTATION' | 'WEEKLY_ROTATION' | 'MONTHLY_ROTATION' | 'SHIFT_ROTATION';
  
  // 轮换配置
  rotationConfig: {
    mode: 'SEQUENTIAL' | 'BALANCED' | 'RANDOM';  // 顺序、负载均衡、随机
    cycle: number;                               // 轮换周期
    skipWeekends: boolean;                       // 是否跳过周末
    skipHolidays: boolean;                       // 是否跳过节假日
  };
  
  // 班次配置
  shifts: {
    shiftId: number;
    roles: ShiftRole[];                          // 该班次需要的角色
    startTime: string;
    endTime: string;
    isOvernight: boolean;                        // 是否跨夜班
  }[];
  
  // 人员/编组配置
  assignmentConfig: {
    type: 'INDIVIDUAL' | 'GROUP' | 'MIXED';     // 个人、编组、混合
    groups?: Group[];                            // 编组列表
    individuals?: Employee[];                    // 个人列表
  };
  
  // 约束条件
  constraints: {
    maxConsecutiveDays: number;                  // 最大连续天数
    minRestHours: number;                        // 最小休息时间
    maxWorkHoursPerWeek: number;                 // 每周最大工作时间
    forbiddenCombinations: string[];             // 禁止的班次组合
  };
}
```

### 3. 编组管理优化

**编组作为排班单元**：
```typescript
interface Group {
  id: number;
  name: string;
  type: 'FIXED_PAIR' | 'ROTATION_GROUP' | 'SKILL_GROUP';  // 固定搭配、轮换组、技能组
  members: Employee[];
  rotationOrder?: number[];                                // 组内轮换顺序
  applicableRoles: ShiftRole[];                           // 适用的值班角色
  isActive: boolean;
}
```

## 二、用户体验优化方案

### 1. 菜单结构重新设计

**简化后的菜单结构**：
```
├── 📊 概览仪表板
├── 📅 排班管理（核心功能）
│   ├── 排班日历
│   ├── 排班规则配置
│   ├── 值班角色定义
│   └── 编组管理
├── 👥 人员管理
│   ├── 员工信息
│   ├── 人员状态
│   └── 批量导入
├── 🏢 基础设置
│   ├── 部门管理
│   ├── 组织岗位
│   └── 系统配置
```

### 2. 排班操作流程优化

**新的操作流程**：
1. **一次性设置**：
   - 导入员工信息 → 定义值班角色 → 创建编组 → 配置排班规则

2. **日常排班**：
   - 进入排班日历 → 选择规则模板 → 一键生成排班 → 处理冲突

3. **临时调整**：
   - 点击日历条目 → 快速替班 → 系统推荐人员 → 确认变更

### 3. 智能化辅助功能

**排班助手功能**：
- 自动检测人员状态冲突
- 智能推荐替班人员
- 负载均衡提醒
- 规则违反警告

## 三、核心功能实现方案

### 1. 排班规则引擎

**规则模板示例**：
```typescript
// 每日轮换模板
const dailyRotationTemplate = {
  name: "每日轮换值班",
  ruleType: "DAILY_ROTATION",
  rotationConfig: {
    mode: "SEQUENTIAL",
    cycle: 1,
    skipWeekends: false,
    skipHolidays: true
  }
};

// 编组轮换模板
const groupRotationTemplate = {
  name: "双人编组值班",
  assignmentConfig: {
    type: "GROUP",
    groups: [
      { name: "A组", members: ["张三", "李四"] },
      { name: "B组", members: ["王五", "赵六"] }
    ]
  }
};
```

### 2. 人员状态管理

**状态变更流程**：
```typescript
interface StatusChange {
  employeeId: number;
  status: 'LEAVE' | 'BUSINESS_TRIP' | 'AVAILABLE';
  startDate: Date;
  endDate?: Date;
  reason: string;
  approvedBy?: number;
  autoReschedule: boolean; // 是否自动重新排班
}
```

### 3. 冲突检测与解决

**冲突类型**：
- 人员状态冲突（请假期间排班）
- 时间重叠冲突（同一人多个班次）
- 资质不符冲突（人员不满足角色要求）
- 规则违反冲突（连续工作超限）

## 四、数据模型优化

### 1. 核心实体关系

```typescript
// 保持现有实体，增加新字段
@Entity()
export class Employee {
  // 现有字段保持不变
  @Column('simple-array', { nullable: true })
  availableShiftRoles: number[]; // 可胜任的值班角色ID

  @Column('simple-array', { nullable: true })
  tags: string[]; // 能力标签

  @Column({ default: 'AVAILABLE' })
  currentStatus: string; // 当前状态
}

// 新增值班角色实体
@Entity()
export class ShiftRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  requiredTags: string[];

  @Column({ default: false })
  isLeaderRole: boolean;

  @Column({ default: 1 })
  priority: number;
}

// 新增排班规则实体
@Entity()
export class ScheduleRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  ruleType: string;

  @Column('json')
  config: any; // 存储完整的规则配置
}
```

## 五、实施步骤

### 阶段一：核心功能优化（2周）
1. 新增ShiftRole和ScheduleRule实体
2. 优化Employee实体，增加值班角色关联
3. 重构排班日历界面，集成编组功能
4. 实现基础的规则引擎

### 阶段二：用户体验提升（1周）
1. 重新设计菜单结构
2. 优化排班操作流程
3. 增加批量导入功能
4. 完善移动端适配

### 阶段三：智能化增强（1周）
1. 实现冲突检测算法
2. 添加智能推荐功能
3. 完善状态管理流程
4. 增加数据统计分析

## 六、配置示例

### 医院排班配置
```yaml
规则名称: 医院三班倒
轮换模式: 每日轮换
班次配置:
  - 白班: 08:00-16:00, 角色: [值班医生, 值班护士]
  - 晚班: 16:00-24:00, 角色: [值班医生, 值班护士]  
  - 夜班: 00:00-08:00, 角色: [值班医生, 值班护士]
约束条件:
  - 夜班后必须休息24小时
  - 最大连续工作3天
```

### 机关单位排班配置
```yaml
规则名称: 机关双岗值班
轮换模式: 编组轮换
编组配置:
  - A组: [张处长, 李科员]
  - B组: [王处长, 赵科员]
班次配置:
  - 全天: 00:00-24:00, 角色: [值班领导, 值班员]
特殊规则:
  - 节假日启用特殊编组
  - 重要会议期间固定人员
```

## 七、技术实现要点

### 1. 保持现有架构
- 继续使用NestJS + TypeScript后端
- 保持Vue3 + Element Plus前端
- SQLite数据库不变

### 2. 渐进式改进
- 不删除现有功能，只优化和整合
- 新增功能向后兼容
- 保持API稳定性

### 3. 用户友好
- 提供配置向导
- 丰富的模板库
- 详细的操作指南

这个方案既保持了现有项目的完整性，又通过合理的整合和优化，实现了更好的用户体验和更强的通用性。