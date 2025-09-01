#!/bin/bash

echo "🚀 超简化排班系统部署"
echo "===================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    apt update
    apt install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
fi

echo "✅ Docker 准备完成"

# 创建简单的 docker-compose 配置
cat > docker-compose.minimal.yml << 'EOF'
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
    environment:
      - NODE_ENV=production
      - PORT=9020
    command: sh -c "npm install --legacy-peer-deps && npm run build && npm run start:prod"
    restart: unless-stopped

  schedule-ui:
    image: nginx:alpine
    container_name: schedule-ui
    ports:
      - "80:80"
    volumes:
      - ./schedule-ui/dist:/usr/share/nginx/html
      - ./nginx-simple.conf:/etc/nginx/nginx.conf
    depends_on:
      - schedule-api
    restart: unless-stopped
EOF

# 创建简单的 nginx 配置
cat > nginx-simple.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

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
        }
    }
}
EOF

# 构建前端
echo "🔨 构建前端..."
cd schedule-ui
if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
fi
npm run build
cd ..

# 启动服务
echo "🚀 启动服务..."
docker-compose -f docker-compose.minimal.yml up -d

echo "⏳ 等待服务启动..."
sleep 20

# 检查状态
echo "📊 服务状态:"
docker-compose -f docker-compose.minimal.yml ps

# 获取IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "🎉 部署完成！"
echo "============="
echo ""
echo "📍 访问地址: http://$SERVER_IP"
echo "👤 默认账号: admin / admin123"
echo ""
echo "🔧 管理命令:"
echo "   docker-compose -f docker-compose.minimal.yml ps"
echo "   docker-compose -f docker-compose.minimal.yml logs -f"
echo "   docker-compose -f docker-compose.minimal.yml restart"
echo ""