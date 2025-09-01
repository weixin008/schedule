# 排班系统部署指南

## 项目概述

这是一个基于 Vue 3 + NestJS 的排班管理系统，包含前端界面和后端API。

### 技术栈
- **前端**: Vue 3 + TypeScript + Element Plus + Vite
- **后端**: NestJS + TypeScript + SQLite + TypeORM
- **数据库**: SQLite (生产环境可切换到 PostgreSQL/MySQL)

## 项目结构

```
├── schedule-ui/          # 前端应用 (Vue 3)
├── schedule-api/         # 后端API (NestJS)
├── package.json          # 根目录依赖
└── DEPLOYMENT.md         # 部署文档
```

## 本地开发环境搭建

### 1. 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0

### 2. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd schedule-api
npm install

# 安装前端依赖
cd ../schedule-ui
npm install
```

### 3. 启动开发环境
```bash
# 启动后端 (端口: 9020)
cd schedule-api
npm run start:dev

# 启动前端 (端口: 9010)
cd schedule-ui
npm run dev
```

访问 http://localhost:9010 即可使用系统。

## 生产环境部署

### 方案一: 传统服务器部署

#### 1. 服务器要求
- Ubuntu 20.04+ / CentOS 7+ / Windows Server
- Node.js 18+
- Nginx (推荐)
- PM2 (进程管理)

#### 2. 部署步骤

**安装 Node.js 和 PM2:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2
```

**部署应用:**
```bash
# 1. 克隆代码到服务器
git clone <your-repo-url>
cd schedule-system

# 2. 安装依赖
npm install
cd schedule-api && npm install
cd ../schedule-ui && npm install

# 3. 构建前端
cd schedule-ui
npm run build

# 4. 构建后端
cd ../schedule-api
npm run build

# 5. 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置生产环境配置
```

**创建 PM2 配置文件:**
```bash
# 在项目根目录创建 ecosystem.config.js
```

#### 3. Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/schedule-ui/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:9020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 方案二: Docker 部署

#### 1. 创建 Dockerfile

**后端 Dockerfile (schedule-api/Dockerfile):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 9020

CMD ["npm", "run", "start:prod"]
```

**前端 Dockerfile (schedule-ui/Dockerfile):**
```dockerfile
FROM node:18-alpine as build-stage

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. Docker Compose 配置
```yaml
version: '3.8'

services:
  schedule-api:
    build: ./schedule-api
    ports:
      - "9020:9020"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  schedule-ui:
    build: ./schedule-ui
    ports:
      - "80:80"
    depends_on:
      - schedule-api
    restart: unless-stopped
```

#### 3. 部署命令
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方案三: 云平台部署

#### Vercel (前端)
1. 连接 GitHub 仓库
2. 设置构建命令: `cd schedule-ui && npm run build`
3. 设置输出目录: `schedule-ui/dist`
4. 配置环境变量

#### Railway/Render (后端)
1. 连接 GitHub 仓库
2. 设置启动命令: `cd schedule-api && npm run start:prod`
3. 配置环境变量
4. 设置健康检查

#### 阿里云/腾讯云
1. 购买云服务器 ECS
2. 配置安全组开放端口 80, 443
3. 按照传统服务器部署方案操作

## 环境变量配置

### 后端环境变量 (schedule-api/.env)
```env
NODE_ENV=production
PORT=9020
JWT_SECRET=your-jwt-secret-key
DATABASE_URL=./db.sqlite

# 如果使用 PostgreSQL
# DATABASE_TYPE=postgres
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USERNAME=username
# DATABASE_PASSWORD=password
# DATABASE_NAME=schedule_db
```

### 前端环境变量 (schedule-ui/.env.production)
```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## 数据库配置

### SQLite (默认)
- 数据文件: `schedule-api/db.sqlite`
- 适合小型部署，无需额外配置

### PostgreSQL (推荐生产环境)
```bash
# 安装 PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 创建数据库
sudo -u postgres createdb schedule_db
sudo -u postgres createuser schedule_user
sudo -u postgres psql -c "ALTER USER schedule_user PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE schedule_db TO schedule_user;"
```

## 监控和维护

### PM2 进程管理
```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart all

# 监控
pm2 monit
```

### 日志管理
```bash
# 设置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 备份策略
```bash
# 数据库备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /path/to/db.sqlite /backup/db_backup_$DATE.sqlite

# 定时备份 (crontab)
0 2 * * * /path/to/backup_script.sh
```

## 性能优化

### 前端优化
- 启用 Gzip 压缩
- 配置 CDN
- 图片懒加载
- 代码分割

### 后端优化
- 数据库索引优化
- Redis 缓存
- API 响应压缩
- 连接池配置

## 安全配置

### HTTPS 配置
```bash
# 使用 Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 防火墙配置
```bash
# UFW 配置
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 故障排查

### 常见问题
1. **端口冲突**: 检查端口占用 `netstat -tulpn | grep :9020`
2. **权限问题**: 确保文件权限正确 `chmod -R 755 /path/to/app`
3. **内存不足**: 监控内存使用 `free -h`
4. **数据库连接**: 检查数据库配置和网络连接

### 日志位置
- 应用日志: `~/.pm2/logs/`
- Nginx 日志: `/var/log/nginx/`
- 系统日志: `/var/log/syslog`

## 联系支持

如有部署问题，请检查:
1. Node.js 版本是否符合要求
2. 端口是否被占用
3. 防火墙设置是否正确
4. 环境变量是否配置完整