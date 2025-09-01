# 简化排班系统使用示例

## 核心理念

简化后的排班系统只需要两个核心配置：
1. **值班角色配置** - 定义需要什么样的人
2. **排班规则** - 定义何时需要值班以及如何轮换

## 配置示例

### 1. 医院三班倒排班

#### 步骤1：配置班次
```json
// 白班
{
  "name": "白班",
  "startTime": "08:00",
  "endTime": "16:00",
  "type": "白班"
}

// 晚班
{
  "name": "晚班", 
  "startTime": "16:00",
  "endTime": "24:00",
  "type": "晚班"
}

// 夜班
{
  "name": "夜班",
  "startTime": "00:00", 
  "endTime": "08:00",
  "type": "夜班"
}
```

#### 步骤2：配置值班角色
```json
// 值班医生角色
{
  "name": "值班医生",
  "selectionCriteria": {
    "byPosition": ["主治医师", "副主任医师", "主任医师"]
  },
  "assignmentType": "SINGLE",
  "isRequired": true
}

// 值班护士角色
{
  "name": "值班护士",
  "selectionCriteria": {
    "byPosition": ["护士", "护师", "主管护师"]
  },
  "assignmentType": "SINGLE", 
  "isRequired": true
}
```

#### 步骤3：配置排班规则
```json
{
  "name": "医院三班倒排班",
  "rotationType": "DAILY",
  "timeConfig": {
    "shifts": [
      {"id": 1}, // 白班
      {"id": 2}, // 晚班  
      {"id": 3}  // 夜班
    ],
    "workDays": [1,2,3,4,5,6,7], // 每天都要
    "skipHolidays": false
  },
  "roleConfig": {
    "roles": [
      {"id": 1}, // 值班医生
      {"id": 2}  // 值班护士
    ],
    "allowEmpty": false
  },
  "rotationConfig": {
    "mode": "SEQUENTIAL", // 顺序轮换
    "cycle": 1 // 每天轮换
  },
  "constraints": {
    "maxConsecutiveDays": 3,
    "minRestHours": 24,
    "forbiddenCombinations": ["夜班->白班"]
  }
}
```

#### 步骤4：生成排班
```javascript
// API调用
POST /api/simplified-schedule-engine/generate
{
  "ruleId": 1,
  "startDate": "2025-02-01",
  "endDate": "2025-02-28"
}
```

### 2. 机关单位双岗值班

#### 步骤1：配置班次
```json
{
  "name": "全天值班",
  "startTime": "00:00",
  "endTime": "24:00", 
  "type": "全天"
}
```

#### 步骤2：配置值班角色
```json
// 值班领导角色
{
  "name": "值班领导",
  "selectionCriteria": {
    "byPosition": ["处长", "副处长", "科长"]
  },
  "assignmentType": "SINGLE",
  "isRequired": true
}

// 值班员角色（使用编组）
{
  "name": "值班员",
  "selectionCriteria": {
    "byPosition": ["科员", "主任科员"]
  },
  "assignmentType": "GROUP", // 编组分配
  "isRequired": true
}
```

#### 步骤3：配置编组
```json
// A组
{
  "name": "A组值班搭档",
  "type": "FIXED_PAIR",
  "memberIds": [1, 2], // 张三、李四的ID
  "applicableRoles": ["值班员"]
}

// B组  
{
  "name": "B组值班搭档",
  "type": "FIXED_PAIR", 
  "memberIds": [3, 4], // 王五、赵六的ID
  "applicableRoles": ["值班员"]
}
```

#### 步骤4：配置排班规则
```json
{
  "name": "机关双岗值班",
  "rotationType": "DAILY",
  "timeConfig": {
    "shifts": [{"id": 1}], // 全天值班
    "workDays": [1,2,3,4,5,6,7],
    "skipHolidays": false
  },
  "roleConfig": {
    "roles": [
      {"id": 1}, // 值班领导
      {"id": 2}  // 值班员（编组）
    ]
  },
  "rotationConfig": {
    "mode": "SEQUENTIAL",
    "cycle": 1
  }
}
```

### 3. 学校周末值班

#### 配置特点
- 只在周末值班
- 单人值班
- 按部门轮换

```json
{
  "name": "学校周末值班",
  "rotationType": "WEEKLY",
  "timeConfig": {
    "shifts": [{"id": 1}], // 全天
    "workDays": [6, 7], // 只有周六周日
    "skipHolidays": true
  },
  "roleConfig": {
    "roles": [
      {
        "name": "值班老师",
        "selectionCriteria": {
          "byPosition": ["教师", "讲师", "副教授", "教授"]
        },
        "assignmentType": "SINGLE"
      }
    ]
  },
  "rotationConfig": {
    "mode": "BALANCED", // 负载均衡
    "cycle": 7
  }
}
```

## 系统工作流程

### 自动排班流程
1. **读取规则** - 获取排班规则配置
2. **解析时间** - 根据timeConfig确定需要排班的日期和班次
3. **解析角色** - 根据roleConfig确定每个班次需要的角色
4. **筛选人员** - 根据角色的selectionCriteria筛选可用人员
5. **执行轮换** - 根据rotationConfig进行人员或编组轮换
6. **生成排班** - 创建具体的排班记录
7. **冲突检测** - 检查并处理可能的冲突

### 核心优势
1. **配置驱动** - 通过配置而非编程实现复杂排班逻辑
2. **逻辑清晰** - 角色配置 + 规则配置 = 自动排班
3. **高度灵活** - 支持各种轮换模式和筛选条件
4. **易于维护** - 修改配置即可调整排班逻辑

### 扩展能力
- 支持更多筛选条件（按标签、按部门、按技能等）
- 支持更复杂的轮换逻辑（负载均衡、优先级等）
- 支持更多约束条件（连续工作限制、休息时间等）
- 支持特殊日期处理（节假日、重要会议等）

## API使用示例

### 生成排班
```bash
curl -X POST http://localhost:9020/api/simplified-schedule-engine/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": 1,
    "startDate": "2025-02-01", 
    "endDate": "2025-02-28"
  }'
```

### 预览排班
```bash
curl -X POST http://localhost:9020/api/simplified-schedule-engine/preview \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": 1,
    "startDate": "2025-02-01",
    "endDate": "2025-02-07"
  }'
```

### 检查规则
```bash
curl -X GET http://localhost:9020/api/simplified-schedule-engine/check-rule/1
```

## 总结

通过这种简化的设计，排班管理变得非常直观：
1. **定义角色** - 我需要什么样的人来值班
2. **制定规则** - 什么时候需要值班，如何轮换
3. **自动生成** - 系统根据配置自动生成排班

这样就实现了你说的"值班角色配置和排班规则两个部分进行逻辑的实现，互相影响和制约，就能生成一个排班的逻辑"。