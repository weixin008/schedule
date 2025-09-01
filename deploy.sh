#!/bin/bash

# 排班系统部署脚本
# Usage: ./deploy.sh [development|production|docker]

set -e

MODE=${1:-development}

echo "🚀 开始部署排班系统 - 模式: $MODE"

# 检查 Node.js 版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js 版本过低，需要 18+，当前版本: $(node -v)"
        exit 1
    fi
    
    echo "✅ Node.js 版本检查通过: $(node -v)"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装依赖..."
    
    # 根目录依赖
    npm install
    
    # 后端依赖
    cd schedule-api
    npm install
    cd ..
    
    # 前端依赖
    cd schedule-ui
    npm install
    cd ..
    
    echo "✅ 依赖安装完成"
}

# 构建应用
build_applications() {
    echo "🔨 构建应用..."
    
    # 构建后端
    cd schedule-api
    npm run build
    cd ..
    
    # 构建前端
    cd schedule-ui
    npm run build
    cd ..
    
    echo "✅ 应用构建完成"
}

# 设置环境变量
setup_environment() {
    echo "⚙️  设置环境变量..."
    
    # 后端环境变量
    if [ ! -f "schedule-api/.env" ]; then
        cp schedule-api/.env.example schedule-api/.env
        echo "📝 已创建 schedule-api/.env，请根据需要修改配置"
    fi
    
    # 前端环境变量
    if [ ! -f "schedule-ui/.env" ]; then
        cp schedule-ui/.env.example schedule-ui/.env
        echo "📝 已创建 schedule-ui/.env，请根据需要修改配置"
    fi
    
    echo "✅ 环境变量设置完成"
}

# 开发模式部署
deploy_development() {
    echo "🔧 开发模式部署..."
    
    check_node_version
    install_dependencies
    setup_environment
    
    echo "✅ 开发环境部署完成！"
    echo ""
    echo "启动命令:"
    echo "  后端: cd schedule-api && npm run start:dev"
    echo "  前端: cd schedule-ui && npm run dev"
    echo ""
    echo "访问地址: http://localhost:9010"
}

# 生产模式部署
deploy_production() {
    echo "🏭 生产模式部署..."
    
    check_node_version
    install_dependencies
    build_applications
    setup_environment
    
    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        echo "📦 安装 PM2..."
        sudo npm install -g pm2
    fi
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动应用
    echo "🚀 启动应用..."
    pm2 start ecosystem.config.js --env production
    
    echo "✅ 生产环境部署完成！"
    echo ""
    echo "管理命令:"
    echo "  查看状态: pm2 status"
    echo "  查看日志: pm2 logs"
    echo "  重启应用: pm2 restart all"
    echo ""
    echo "访问地址: http://localhost:9020 (需要配置 Nginx 反向代理)"
}

# Docker 部署
deploy_docker() {
    echo "🐳 Docker 部署..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    setup_environment
    
    # 停止并移除旧容器
    echo "🛑 停止并移除旧容器..."
    docker-compose down
    
    # 构建并启动容器
    echo "🔨 构建 Docker 镜像..."
    docker-compose build
    
    echo "🚀 启动容器..."
    docker-compose up -d
    
    echo "✅ Docker 部署完成！"
    echo ""
    echo "管理命令:"
    echo "  查看状态: docker-compose ps"
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose down"
    echo ""
    echo "访问地址: http://localhost"
}

# 清理函数
cleanup() {
    echo "🧹 清理临时文件..."
    # 可以在这里添加清理逻辑
}

# 主逻辑
case $MODE in
    "development"|"dev")
        deploy_development
        ;;
    "production"|"prod")
        deploy_production
        ;;
    "docker")
        deploy_docker
        ;;
    *)
        echo "❌ 未知部署模式: $MODE"
        echo "使用方法: $0 [development|production|docker]"
        exit 1
        ;;
esac

# 注册清理函数
trap cleanup EXIT

echo "🎉 部署完成！"