# 服务器 Docker 一键部署指南

## 🚀 快速部署到服务器

### 1. 服务器环境要求
- Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- Docker 20.10+
- Docker Compose 1.29+
- 至少 2GB RAM，10GB 磁盘空间

### 2. 一键部署命令

```bash
# 克隆项目
git clone https://github.com/weixin008/schedule.git
cd schedule

# 一键启动
./docker-deploy.sh start
```

### 3. 详细部署步骤

#### 步骤 1: 安装 Docker (如果未安装)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用用户组更改
exit
```

#### 步骤 2: 克隆并配置项目
```bash
# 克隆项目
git clone https://github.com/weixin008/schedule.git
cd schedule

# 配置环境变量 (可选)
cp .env.docker .env
nano .env  # 修改配置，特别是 JWT_SECRET
```

#### 步骤 3: 启动服务
```bash
# 方式一：使用部署脚本 (推荐)
chmod +x docker-deploy.sh
./docker-deploy.sh start

# 方式二：直接使用 Docker Compose
docker-compose up -d
```

#### 步骤 4: 验证部署
```bash
# 查看服务状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs

# 测试访问
curl http://localhost/health
curl http://localhost:9020/api/health
```

### 4. 配置域名和 HTTPS (可选)

#### 使用 Nginx 反向代理
```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/schedule
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api {
        proxy_pass http://localhost:9020;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/schedule /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 配置 HTTPS (使用 Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 5. 常用管理命令

```bash
# 启动服务
./docker-deploy.sh start

# 停止服务
./docker-deploy.sh stop

# 重启服务
./docker-deploy.sh restart

# 查看状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs

# 更新服务 (拉取最新代码)
./docker-deploy.sh update

# 备份数据
./docker-deploy.sh backup

# 清理资源 (谨慎使用)
./docker-deploy.sh cleanup
```

### 6. 端口配置

默认端口：
- 前端界面: `80` (HTTP)
- 后端 API: `9020`

如需修改端口，编辑 `.env` 文件：
```env
UI_PORT=8080      # 前端端口
API_PORT=3000     # 后端端口
```

### 7. 防火墙配置

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 8. 监控和维护

#### 设置自动重启
```bash
# 创建 systemd 服务
sudo nano /etc/systemd/system/schedule-system.service
```

```ini
[Unit]
Description=Schedule System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/schedule
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# 启用服务
sudo systemctl enable schedule-system.service
sudo systemctl start schedule-system.service
```

#### 日志轮转
```bash
# 配置 Docker 日志轮转
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

### 9. 故障排查

#### 常见问题
1. **端口被占用**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo lsof -i :80
   ```

2. **Docker 服务未启动**
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **权限问题**
   ```bash
   sudo usermod -aG docker $USER
   # 重新登录
   ```

4. **内存不足**
   ```bash
   free -h
   docker system prune -a  # 清理未使用的镜像
   ```

#### 查看详细日志
```bash
# 查看容器日志
docker-compose logs -f schedule-api
docker-compose logs -f schedule-ui

# 查看系统资源
docker stats

# 查看容器状态
docker-compose ps
```

### 10. 性能优化

#### 生产环境配置
```bash
# 编辑 .env 文件
nano .env
```

```env
# 生产环境配置
NODE_ENV=production
JWT_SECRET=your-very-secure-jwt-secret-key

# 数据库优化 (如果使用 PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_USERNAME=schedule_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=schedule_production

# 缓存配置 (如果使用 Redis)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

#### 资源限制
```yaml
# 在 docker-compose.yml 中添加资源限制
services:
  schedule-api:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
  
  schedule-ui:
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
```

### 11. 备份和恢复

#### 自动备份脚本
```bash
# 创建备份脚本
nano backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/schedule"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据卷
docker run --rm -v schedule-system_schedule_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/data_$DATE.tar.gz -C /data .

# 备份配置文件
tar czf $BACKUP_DIR/config_$DATE.tar.gz .env docker-compose.yml

# 清理旧备份 (保留最近7天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR"
```

```bash
# 设置定时备份
chmod +x backup.sh
crontab -e
# 添加: 0 2 * * * /path/to/backup.sh
```

### 12. 访问系统

部署完成后，通过以下地址访问：

- **前端界面**: http://your-server-ip 或 http://your-domain.com
- **API 文档**: http://your-server-ip:9020/api-docs

默认管理员账号：
- 用户名: admin
- 密码: admin123 (首次登录后请修改)

---

## 🎉 部署完成！

现在你的排班系统已经成功部署到服务器上了。如果遇到任何问题，请查看日志或参考故障排查部分。