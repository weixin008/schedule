#!/bin/bash

# 简化的排班系统部署脚本
echo "🚀 开始部署排班系统..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    apt update
    apt install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 安装 Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "✅ Docker 环境准备完成"

# 创建环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cat > .env << EOF
# 端口配置
API_PORT=9020
UI_PORT=80

# JWT 密钥
JWT_SECRET=schedule-jwt-secret-$(date +%s)

# CORS 配置
CORS_ORIGIN=http://localhost

# API URL
API_URL=http://localhost:9020/api
EOF
    echo "✅ 环境变量文件创建完成"
fi

# 构建并启动服务
echo "🔨 构建 Docker 镜像..."
docker-compose -f docker-compose.simple.yml build

echo "🚀 启动服务..."
docker-compose -f docker-compose.simple.yml up -d

echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose -f docker-compose.simple.yml ps

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "🎉 部署完成！"
echo "==============="
echo ""
echo "📍 访问地址:"
echo "   前端界面: http://$SERVER_IP"
echo "   后端API:  http://$SERVER_IP:9020/api"
echo ""
echo "👤 默认账号:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "🔧 管理命令:"
echo "   查看状态: docker-compose -f docker-compose.simple.yml ps"
echo "   查看日志: docker-compose -f docker-compose.simple.yml logs -f"
echo "   重启服务: docker-compose -f docker-compose.simple.yml restart"
echo "   停止服务: docker-compose -f docker-compose.simple.yml down"
echo ""