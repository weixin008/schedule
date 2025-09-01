# 排班管理系统

一个基于 Vue 3 + NestJS 的现代化排班管理系统，支持智能排班、角色管理、部门配置等功能。

## 🚀 快速开始

### 方式一：服务器一键部署（最简单）

**直接在服务器上运行:**
```bash
# 一键部署到服务器 (Ubuntu/Debian/CentOS)
curl -fsSL https://raw.githubusercontent.com/weixin008/schedule/main/quick-deploy.sh | bash
```

### 方式二：Docker 本地部署

**从 GitHub 克隆并部署:**
```bash
# 克隆项目
git clone https://github.com/weixin008/schedule.git
cd schedule

# 一键启动 (Linux/macOS)
./docker-deploy.sh start

# 一键启动 (Windows)
docker-deploy.bat start
```

**直接使用 Docker Compose:**
```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 方式二：使用部署脚本

**Windows:**
```bash
# 开发环境
deploy.bat development

# 生产环境
deploy.bat production

# Docker 部署
deploy.bat docker
```

**Linux/macOS:**
```bash
# 开发环境
./deploy.sh development

# 生产环境
./deploy.sh production

# Docker 部署
./deploy.sh docker
```

### 方式二：手动部署

1. **安装依赖**
```bash
npm install
cd schedule-api && npm install
cd ../schedule-ui && npm install
```

2. **启动开发环境**
```bash
# 后端 (端口: 9020)
cd schedule-api
npm run start:dev

# 前端 (端口: 9010)
cd schedule-ui
npm run dev
```

3. **访问系统**
打开浏览器访问: http://localhost:9010

## 📁 项目结构

```
├── schedule-api/          # 后端 API (NestJS)
│   ├── src/              # 源代码
│   ├── dist/             # 构建输出
│   └── package.json      # 后端依赖
├── schedule-ui/           # 前端界面 (Vue 3)
│   ├── src/              # 源代码
│   ├── dist/             # 构建输出
│   └── package.json      # 前端依赖
├── docker-compose.yml     # Docker 编排
├── ecosystem.config.js    # PM2 配置
├── deploy.sh             # Linux/macOS 部署脚本
├── deploy.bat            # Windows 部署脚本
└── DEPLOYMENT.md         # 详细部署文档
```

## 🛠 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **UI 库**: Element Plus
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **图表**: ECharts

### 后端
- **框架**: NestJS + TypeScript
- **数据库**: SQLite (可切换 PostgreSQL)
- **ORM**: TypeORM
- **认证**: JWT
- **文档**: 自动生成 API 文档

## 🌟 主要功能

- ✅ **用户管理**: 登录认证、角色权限
- ✅ **员工管理**: 员工信息、部门配置
- ✅ **排班管理**: 智能排班、手动调整
- ✅ **角色配置**: 值班角色、时间设置
- ✅ **数据统计**: 排班报表、工作量分析
- ✅ **系统设置**: 参数配置、数据导入导出

## 🚀 部署选项

### 1. Docker 部署（推荐）
适合生产环境和快速部署
- 🐳 一键启动，环境一致
- 🔄 自动重启和健康检查
- 📊 服务监控和日志管理
- 🔧 易于扩展和维护

### 2. 开发环境
适合本地开发和测试
- 🔥 热重载开发体验
- 🛠 开发工具集成
- 📝 详细错误信息

### 3. 生产环境
适合传统服务器部署
- ⚡ PM2 进程管理
- 🚀 性能优化配置
- 📋 完整日志管理
- 🔄 自动重启机制

## 🐳 Docker 快速命令

```bash
# 启动服务
./docker-deploy.sh start

# 查看状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs

# 重启服务
./docker-deploy.sh restart

# 停止服务
./docker-deploy.sh stop

# 更新服务
./docker-deploy.sh update

# 备份数据
./docker-deploy.sh backup
```

## 📖 详细文档

- [部署指南](DEPLOYMENT.md) - 完整的部署说明
- [API 文档](http://localhost:9020/api-docs) - 后端 API 接口文档
- [开发指南](docs/development.md) - 开发环境配置和规范

## 🔧 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- (可选) Docker & Docker Compose
- (可选) PM2 (生产环境)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 支持

如果遇到问题，请：

1. 查看 [部署指南](DEPLOYMENT.md)
2. 检查 [常见问题](docs/faq.md)
3. 提交 [Issue](../../issues)

---

**快速启动命令:**
```bash
# Windows
deploy.bat development

# Linux/macOS  
./deploy.sh development
```