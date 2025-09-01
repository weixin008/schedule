#!/bin/bash

echo "=== 重新部署排班系统 ==="

# 停止并删除现有容器
echo "停止现有容器..."
docker-compose down

# 清理旧的镜像（可选）
echo "清理旧镜像..."
docker image prune -f

# 重新构建并启动
echo "重新构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查容器状态
echo "检查容器状态..."
docker-compose ps

# 查看日志
echo "查看最近的日志..."
docker-compose logs --tail=20

echo "=== 部署完成 ==="
echo "前端访问地址: http://117.72.205.253:9010"
echo "后端API地址: http://117.72.205.253:9020/api"
echo ""
echo "如需查看实时日志，请运行: docker-compose logs -f"