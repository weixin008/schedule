#!/bin/bash

echo "🚀 修复版排班系统部署"
echo "==================="

# 检查并安装 Docker
if ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    apt update
    apt install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
fi

# 安装 Node.js (用于本地构建)
if ! command -v npm &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    apt-get install -y nodejs
fi

echo "✅ 环境准备完成"

# 检查端口占用
echo "🔍 检查端口占用..."
if netstat -tulpn | grep -q ":80 "; then
    echo "⚠️  端口 80 被占用，使用端口 8080"
    UI_PORT=8080
else
    UI_PORT=80
fi

# 停止可能冲突的服务
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl stop httpd 2>/dev/null || true
sudo fuser -k 80/tcp 2>/dev/null || true

# 清理之前的容器
docker-compose -f docker-compose.minimal.yml down 2>/dev/null || true
docker rm -f schedule-api schedule-ui 2>/dev/null || true

# 构建前端
echo "🔨 构建前端..."
cd schedule-ui
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install --legacy-peer-deps
fi
echo "🏗️  构建前端应用..."
npm run build
cd ..

# 创建 nginx 配置
cat > nginx-simple.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://schedule-api:9020;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# 创建 docker-compose 配置
cat > docker-compose.fixed.yml << EOF
version: '3.8'

services:
  schedule-api:
    image: node:20-alpine
    container_name: schedule-api
    working_dir: /app
    ports:
      - "9020:9020"
    volumes:
      - ./schedule-api:/app
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=9020
      - JWT_SECRET=schedule-jwt-secret-$(date +%s)
      - CORS_ORIGIN=http://localhost:$UI_PORT
    command: sh -c "npm install --legacy-peer-deps --omit=dev && npm run build && npm run start:prod"
    restart: unless-stopped
    networks:
      - schedule-net

  schedule-ui:
    image: nginx:alpine
    container_name: schedule-ui
    ports:
      - "$UI_PORT:80"
    volumes:
      - ./schedule-ui/dist:/usr/share/nginx/html:ro
      - ./nginx-simple.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - schedule-api
    restart: unless-stopped
    networks:
      - schedule-net

networks:
  schedule-net:
    driver: bridge

volumes:
  data:
  logs:
EOF

# 创建数据目录
mkdir -p data logs

# 启动服务
echo "🚀 启动服务..."
docker-compose -f docker-compose.fixed.yml up -d

echo "⏳ 等待服务启动..."
sleep 30

# 检查后端是否启动
echo "🔍 检查后端服务..."
for i in {1..10}; do
    if curl -s http://localhost:9020/api/health > /dev/null; then
        echo "✅ 后端服务启动成功"
        break
    fi
    echo "⏳ 等待后端启动... ($i/10)"
    sleep 5
done

# 检查状态
echo "📊 服务状态:"
docker-compose -f docker-compose.fixed.yml ps

# 显示日志
echo "📋 最近日志:"
docker-compose -f docker-compose.fixed.yml logs --tail=10

# 获取IP
SERVER_IP=\$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print \$1}')

echo ""
echo "🎉 部署完成！"
echo "============="
echo ""
echo "📍 访问地址:"
echo "   前端界面: http://\$SERVER_IP:$UI_PORT"
echo "   后端API:  http://\$SERVER_IP:9020/api"
echo ""
echo "👤 默认账号: admin / admin123"
echo ""
echo "🔧 管理命令:"
echo "   查看状态: docker-compose -f docker-compose.fixed.yml ps"
echo "   查看日志: docker-compose -f docker-compose.fixed.yml logs -f"
echo "   重启服务: docker-compose -f docker-compose.fixed.yml restart"
echo "   停止服务: docker-compose -f docker-compose.fixed.yml down"
echo ""
echo "🌐 如果无法访问，请检查防火墙设置:"
echo "   ufw allow $UI_PORT/tcp"
echo "   ufw allow 9020/tcp"
echo ""
EOF