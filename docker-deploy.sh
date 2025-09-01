#!/bin/bash

# 排班系统 Docker 一键部署脚本
# Usage: ./docker-deploy.sh [start|stop|restart|logs|status]

set -e

COMMAND=${1:-start}
PROJECT_NAME="schedule-system"

echo "🐳 排班系统 Docker 部署管理"
echo "================================"

# 检查 Docker 和 Docker Compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker"
        echo "安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
        echo "安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo "✅ Docker 环境检查通过"
}

# 创建环境变量文件
setup_env() {
    if [ ! -f ".env" ]; then
        echo "📝 创建环境变量文件..."
        cp .env.docker .env
        echo "✅ 已创建 .env 文件，请根据需要修改配置"
        echo "💡 提示: 生产环境请务必修改 JWT_SECRET"
    fi
}

# 启动服务
start_services() {
    echo "🚀 启动排班系统..."
    
    check_docker
    setup_env
    
    # 停止并移除旧容器
    echo "🛑 停止并移除旧容器..."
    docker-compose down

    # 构建并启动服务
    echo "🔨 构建 Docker 镜像..."
    docker-compose build --no-cache
    
    echo "🚀 启动容器..."
    docker-compose up -d
    
    echo "⏳ 等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        echo "✅ 服务启动成功！"
        echo ""
        echo "🌐 访问地址:"
        echo "  前端界面: http://localhost"
        echo "  后端API:  http://localhost:9020/api"
        echo ""
        echo "📊 服务状态:"
        docker-compose ps
    else
        echo "❌ 服务启动失败，请查看日志:"
        docker-compose logs
        exit 1
    fi
}

# 停止服务
stop_services() {
    echo "🛑 停止排班系统..."
    docker-compose down
    echo "✅ 服务已停止"
}

# 重启服务
restart_services() {
    echo "🔄 重启排班系统..."
    stop_services
    start_services
}

# 查看日志
show_logs() {
    echo "📋 查看服务日志..."
    docker-compose logs -f --tail=100
}

# 查看状态
show_status() {
    echo "📊 服务状态:"
    docker-compose ps
    echo ""
    echo "💾 存储卷:"
    docker volume ls | grep schedule
    echo ""
    echo "🌐 网络:"
    docker network ls | grep schedule
}

# 清理资源
cleanup() {
    echo "🧹 清理 Docker 资源..."
    read -p "⚠️  这将删除所有容器、镜像和数据卷，确定继续吗？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --rmi all
        echo "✅ 清理完成"
    else
        echo "❌ 取消清理"
    fi
}

# 更新服务
update_services() {
    echo "🔄 更新排班系统..."
    
    # 拉取最新代码 (如果是 git 仓库)
    if [ -d ".git" ]; then
        echo "📥 拉取最新代码..."
        git pull
    fi
    
    # 停止并移除旧容器
    echo "🛑 停止并移除旧容器..."
    docker-compose down

    # 重新构建并启动
    echo "🔨 重新构建镜像..."
    docker-compose build --no-cache
    
    echo "🚀 重启服务..."
    docker-compose up -d
    
    echo "✅ 更新完成"
}

# 备份数据
backup_data() {
    echo "💾 备份数据..."
    
    BACKUP_DIR="./backups"
    BACKUP_FILE="schedule-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p $BACKUP_DIR
    
    # 备份数据卷
    docker run --rm -v schedule-system_schedule_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/$BACKUP_FILE -C /data .
    
    echo "✅ 数据已备份到: $BACKUP_DIR/$BACKUP_FILE"
}

# 主逻辑
case $COMMAND in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "update")
        update_services
        ;;
    "backup")
        backup_data
        ;;
    *)
        echo "使用方法: $0 [start|stop|restart|logs|status|cleanup|update|backup]"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  logs    - 查看日志"
        echo "  status  - 查看状态"
        echo "  cleanup - 清理资源"
        echo "  update  - 更新服务"
        echo "  backup  - 备份数据"
        exit 1
        ;;
esac