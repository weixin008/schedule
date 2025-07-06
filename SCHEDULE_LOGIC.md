# 排班管理系统逻辑文档

## 1. 系统概述
基于1panel框架的排班管理系统，提供完整的员工排班、岗位管理、规则设置等功能。

## 2. 核心功能模块

### 2.1 用户认证与权限管理
- **用户角色**：管理员、部门经理、普通员工
- **权限控制**：基于角色的访问控制(RBAC)
- **登录系统**：用户名密码认证，JWT token管理
- **会话管理**：登录状态持久化

### 2.2 员工管理
- **员工信息**：姓名、工号、部门、岗位、联系方式
- **员工状态**：在职、离职、请假
- **员工档案**：入职时间、工作经历、技能标签
- **部门管理**：部门创建、编辑、删除
- **岗位管理**：岗位设置、职责描述、技能要求

### 2.3 排班规则管理
- **工作时间规则**：标准工作时间、加班规则
- **休息规则**：连续工作限制、休息日设置
- **特殊规则**：节假日安排、夜班补贴
- **冲突检测**：排班冲突自动检测和提醒

### 2.4 排班日历
- **日历视图**：月视图、周视图、日视图
- **排班操作**：拖拽排班、批量排班、复制排班
- **状态管理**：已确认、待确认、已拒绝
- **实时更新**：排班变更实时同步

### 2.5 统计报表
- **工作量统计**：个人工作量、部门工作量
- **出勤统计**：出勤率、迟到早退统计
- **加班统计**：加班时长、加班费用
- **可视化图表**：柱状图、饼图、趋势图

### 2.6 通知系统
- **排班通知**：排班确认、变更通知
- **系统通知**：系统维护、重要公告
- **消息管理**：未读/已读状态、消息分类
- **推送功能**：邮件通知、站内消息

### 2.7 系统设置
- **基础设置**：公司信息、工作时间设置
- **界面设置**：主题、语言、布局
- **安全设置**：密码策略、登录验证
- **数据管理**：数据备份、导入导出

## 3. 数据结构

### 3.1 用户表(users)
```javascript
{
  id: String,
  username: String,
  password: String,
  name: String,
  email: String,
  phone: String,
  role: String, // admin, manager, staff
  department: String,
  position: String,
  status: String, // active, inactive
  joinDate: Date,
  permissions: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 部门表(departments)
```javascript
{
  id: String,
  name: String,
  manager: String,
  description: String,
  employeeCount: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 岗位表(positions)
```javascript
{
  id: String,
  name: String,
  department: String,
  description: String,
  requirements: Array,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.4 排班表(schedules)
```javascript
{
  id: String,
  employeeId: String,
  date: Date,
  shift: String, // morning, afternoon, night
  startTime: String,
  endTime: String,
  status: String, // confirmed, pending, rejected
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.5 排班规则表(schedule_rules)
```javascript
{
  id: String,
  name: String,
  type: String, // time, rest, bonus
  value: String,
  description: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 4. API接口设计

### 4.1 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息

### 4.2 用户管理接口
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 4.3 部门管理接口
- `GET /api/departments` - 获取部门列表
- `POST /api/departments` - 创建部门
- `PUT /api/departments/:id` - 更新部门
- `DELETE /api/departments/:id` - 删除部门

### 4.4 岗位管理接口
- `GET /api/positions` - 获取岗位列表
- `POST /api/positions` - 创建岗位
- `PUT /api/positions/:id` - 更新岗位
- `DELETE /api/positions/:id` - 删除岗位

### 4.5 排班管理接口
- `GET /api/schedules` - 获取排班列表
- `POST /api/schedules` - 创建排班
- `PUT /api/schedules/:id` - 更新排班
- `DELETE /api/schedules/:id` - 删除排班
- `POST /api/schedules/batch` - 批量排班

### 4.6 排班规则接口
- `GET /api/schedule-rules` - 获取规则列表
- `POST /api/schedule-rules` - 创建规则
- `PUT /api/schedule-rules/:id` - 更新规则
- `DELETE /api/schedule-rules/:id` - 删除规则

### 4.7 统计报表接口
- `GET /api/stats/workload` - 工作量统计
- `GET /api/stats/attendance` - 出勤统计
- `GET /api/stats/overtime` - 加班统计

## 5. 前端页面结构

### 5.1 主要页面
- `/dashboard` - 仪表板
- `/users` - 用户管理
- `/departments` - 部门管理
- `/positions` - 岗位管理
- `/schedules` - 排班管理
- `/rules` - 排班规则
- `/calendar` - 排班日历
- `/reports` - 统计报表
- `/notifications` - 消息通知
- `/settings` - 系统设置

### 5.2 组件结构
- `Layout/` - 布局组件
- `Components/` - 通用组件
- `Pages/` - 页面组件
- `Hooks/` - 自定义钩子
- `Services/` - API服务
- `Utils/` - 工具函数
- `Types/` - TypeScript类型定义

## 6. 技术栈

### 6.1 前端技术
- **框架**：Vue 3 (基于1panel)
- **UI库**：Element Plus
- **状态管理**：Pinia
- **路由**：Vue Router
- **HTTP客户端**：Axios
- **构建工具**：Vite
- **语言**：TypeScript

### 6.2 后端技术
- **框架**：Go + Gin (基于1panel)
- **数据库**：MySQL/PostgreSQL
- **ORM**：GORM
- **认证**：JWT
- **缓存**：Redis
- **日志**：Zap

## 7. 部署架构

### 7.1 容器化部署
- **Docker**：应用容器化
- **Docker Compose**：多服务编排
- **Nginx**：反向代理
- **SSL证书**：HTTPS支持

### 7.2 数据持久化
- **数据库备份**：定时备份策略
- **文件存储**：本地存储或云存储
- **日志管理**：日志收集和分析

## 8. 安全考虑

### 8.1 认证安全
- **密码加密**：bcrypt加密
- **JWT安全**：token过期机制
- **会话管理**：安全的会话处理

### 8.2 数据安全
- **SQL注入防护**：参数化查询
- **XSS防护**：输入验证和输出编码
- **CSRF防护**：CSRF token验证

### 8.3 权限控制
- **细粒度权限**：基于角色的权限控制
- **API权限**：接口级别的权限验证
- **数据权限**：数据访问权限控制

## 9. 性能优化

### 9.1 前端优化
- **代码分割**：按需加载
- **缓存策略**：浏览器缓存
- **图片优化**：图片压缩和懒加载

### 9.2 后端优化
- **数据库优化**：索引优化、查询优化
- **缓存策略**：Redis缓存
- **并发处理**：goroutine并发

## 10. 监控和日志

### 10.1 系统监控
- **性能监控**：CPU、内存、磁盘使用率
- **应用监控**：响应时间、错误率
- **业务监控**：用户活跃度、功能使用率

### 10.2 日志管理
- **访问日志**：用户访问记录
- **操作日志**：用户操作记录
- **错误日志**：系统错误记录
- **审计日志**：安全审计记录

---

**注意**：此文档将作为在1panel框架基础上开发排班系统的指导文档，所有功能将按照此逻辑在1panel框架内实现。 