#!/bin/bash

echo "🚀 智能排班系统部署"
echo "=================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查并安装 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_info "安装 Docker..."
        apt update
        apt install -y docker.io docker-compose
        systemctl start docker
        systemctl enable docker
        log_success "Docker 安装完成"
    else
        log_success "Docker 已安装: $(docker --version)"
    fi
}

# 检查并安装 Node.js
check_nodejs() {
    if ! command -v npm &> /dev/null; then
        log_info "安装 Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        apt-get install -y nodejs
        log_success "Node.js 安装完成: $(node --version)"
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_warning "Node.js 版本过低 ($(node --version))，升级到 20.x..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            apt-get install -y nodejs
        else
            log_success "Node.js 版本符合要求: $(node --version)"
        fi
    fi
}

# 智能端口检测
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -le 65535 ]; do
        if ! ss -tulpn | grep -q ":$port "; then
            echo $port
            return
        fi
        ((port++))
    done
    
    log_error "无法找到可用端口"
    exit 1
}

# 检查端口占用并给出建议
check_ports() {
    log_info "检查端口占用情况..."
    
    # 检查端口 80
    if ss -tulpn | grep -q ":80 "; then
        OCCUPIED_80=$(ss -tulpn | grep ":80 " | head -1)
        log_warning "端口 80 被占用: $OCCUPIED_80"
        
        # 检查是否是 nginx/apache
        if pgrep nginx > /dev/null; then
            log_info "检测到 Nginx 服务正在运行"
            echo "建议选项:"
            echo "1. 使用其他端口 (如 8080)"
            echo "2. 配置 Nginx 反向代理"
            echo "3. 临时停止 Nginx (不推荐生产环境)"
        elif pgrep apache2 > /dev/null || pgrep httpd > /dev/null; then
            log_info "检测到 Apache 服务正在运行"
            echo "建议选项:"
            echo "1. 使用其他端口 (如 8080)"
            echo "2. 配置 Apache 反向代理"
            echo "3. 临时停止 Apache (不推荐生产环境)"
        fi
        
        UI_PORT=$(find_available_port 8080)
        log_info "将使用端口 $UI_PORT 作为前端端口"
    else
        UI_PORT=80
        log_success "端口 80 可用"
    fi
    
    # 检查端口 9020
    if ss -tulpn | grep -q ":9020 "; then
        log_warning "端口 9020 被占用"
        API_PORT=$(find_available_port 9021)
        log_info "将使用端口 $API_PORT 作为后端端口"
    else
        API_PORT=9020
        log_success "端口 9020 可用"
    fi
}

# 构建前端
build_frontend() {
    log_info "构建前端应用..."
    cd schedule-ui
    
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install --legacy-peer-deps
    fi
    
    # 设置 API 地址
    export VITE_API_BASE_URL="http://localhost:$API_PORT/api"
    
    log_info "构建前端..."
    npm run build
    
    if [ ! -d "dist" ]; then
        log_error "前端构建失败"
        exit 1
    fi
    
    cd ..
    log_success "前端构建完成"
}

# 创建 nginx 配置
create_nginx_config() {
    cat > nginx-config.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # 前端路由
        location / {
            try_files \$uri \$uri/ /index.html;
        }

        # API 代理
        location /api {
            proxy_pass http://schedule-api:$API_PORT;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
}

# 创建 docker-compose 配置
create_docker_compose() {
    cat > docker-compose.smart.yml << EOF
version: '3.8'

services:
  schedule-api:
    image: node:20-alpine
    container_name: schedule-api
    working_dir: /app
    ports:
      - "$API_PORT:$API_PORT"
    volumes:
      - ./schedule-api:/app
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=$API_PORT
      - JWT_SECRET=schedule-jwt-secret-\$(date +%s | sha256sum | head -c 32)
      - CORS_ORIGIN=http://localhost:$UI_PORT
    command: sh -c "npm install --legacy-peer-deps --omit=dev && npm run build && npm run start:prod"
    restart: unless-stopped
    networks:
      - schedule-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:$API_PORT/api/health", "||", "exit", "1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  schedule-ui:
    image: nginx:alpine
    container_name: schedule-ui
    ports:
      - "$UI_PORT:80"
    volumes:
      - ./schedule-ui/dist:/usr/share/nginx/html:ro
      - ./nginx-config.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      schedule-api:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - schedule-network

networks:
  schedule-network:
    driver: bridge

volumes:
  data:
  logs:
EOF
}

# 部署服务
deploy_services() {
    log_info "创建必要目录..."
    mkdir -p data logs
    
    log_info "清理旧容器..."
    docker-compose -f docker-compose.smart.yml down 2>/dev/null || true
    
    log_info "启动服务..."
    docker-compose -f docker-compose.smart.yml up -d
    
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose -f docker-compose.smart.yml ps
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查后端健康状态
    for i in {1..12}; do
        if curl -s "http://localhost:$API_PORT/api/health" > /dev/null 2>&1; then
            log_success "后端服务运行正常"
            break
        fi
        if [ $i -eq 12 ]; then
            log_error "后端服务启动失败"
            docker-compose -f docker-compose.smart.yml logs schedule-api
            return 1
        fi
        log_info "等待后端服务启动... ($i/12)"
        sleep 5
    done
    
    # 检查前端
    if curl -s "http://localhost:$UI_PORT/health" > /dev/null 2>&1; then
        log_success "前端服务运行正常"
    else
        log_warning "前端健康检查失败，但可能仍然可用"
    fi
}

# 显示部署信息
show_deployment_info() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 部署完成！"
    echo "============="
    echo ""
    echo "📍 访问地址:"
    echo "   前端界面: http://$SERVER_IP:$UI_PORT"
    echo "   后端API:  http://$SERVER_IP:$API_PORT/api"
    echo ""
    echo "👤 默认账号:"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo ""
    echo "🔧 管理命令:"
    echo "   查看状态: docker-compose -f docker-compose.smart.yml ps"
    echo "   查看日志: docker-compose -f docker-compose.smart.yml logs -f"
    echo "   重启服务: docker-compose -f docker-compose.smart.yml restart"
    echo "   停止服务: docker-compose -f docker-compose.smart.yml down"
    echo ""
    echo "🔥 防火墙配置 (如需要):"
    echo "   sudo ufw allow $UI_PORT/tcp"
    echo "   sudo ufw allow $API_PORT/tcp"
    echo ""
    
    if [ "$UI_PORT" != "80" ]; then
        echo "💡 端口说明:"
        echo "   由于端口 80 被占用，前端使用端口 $UI_PORT"
        echo "   如需使用端口 80，请配置反向代理或停止占用服务"
        echo ""
    fi
}

# 主函数
main() {
    log_info "开始智能部署排班系统..."
    
    check_docker
    check_nodejs
    check_ports
    build_frontend
    create_nginx_config
    create_docker_compose
    deploy_services
    
    if verify_deployment; then
        show_deployment_info
        log_success "部署成功完成！"
    else
        log_error "部署验证失败，请检查日志"
        exit 1
    fi
}

# 错误处理
trap 'log_error "部署过程中发生错误"; exit 1' ERR

# 执行主函数
main "$@"