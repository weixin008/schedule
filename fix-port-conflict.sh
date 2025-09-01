#!/bin/bash

echo "🔧 修复端口冲突问题..."

# 停止现有服务
echo "⏹️ 停止现有服务..."
docker-compose -f docker-compose.simple.yml down 2>/dev/null || true
docker-compose down 2>/dev/null || true

# 检查端口占用
echo "🔍 检查端口占用情况..."
PORT_80_USED=$(netstat -tulpn | grep :80 | wc -l)

if [ $PORT_80_USED -gt 0 ]; then
    echo "⚠️ 端口80被占用，使用端口8080部署"
    echo "📋 占用端口80的进程:"
    netstat -tulpn | grep :80
    echo ""
    
    # 使用minimal配置文件
    echo "🚀 使用端口8080启动服务..."
    docker-compose -f docker-compose.minimal.yml up -d
    
    # 等待服务启动
    echo "⏳ 等待服务启动..."
    sleep 20
    
    # 检查服务状态
    echo "📊 服务状态:"
    docker-compose -f docker-compose.minimal.yml ps
    
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 部署完成！"
    echo "============="
    echo ""
    echo "📍 访问地址: http://$SERVER_IP:8080"
    echo "👤 默认账号: admin / admin123"
    echo ""
    echo "🔧 管理命令:"
    echo "   docker-compose -f docker-compose.minimal.yml ps"
    echo "   docker-compose -f docker-compose.minimal.yml logs -f"
    echo "   docker-compose -f docker-compose.minimal.yml restart"
    echo ""
else
    echo "✅ 端口80可用，使用标准配置"
    docker-compose -f docker-compose.simple.yml up -d
    
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    echo "📍 访问地址: http://$SERVER_IP"
fi