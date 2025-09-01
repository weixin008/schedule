#!/bin/bash

# 排班系统服务器一键部署脚本
# 适用于 Ubuntu/Debian/CentOS 服务器
# Usage: curl -fsSL https://raw.githubusercontent.com/weixin008/schedule/main/quick-deploy.sh | bash

set -e

echo "🚀 排班系统服务器一键部署"
echo "=========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS $VER"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "检测到 root 用户，建议使用普通用户部署"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装: $(docker --version)"
        return
    fi
    
    log_info "安装 Docker..."
    
    # 更新包管理器
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        
        # 添加 Docker 官方 GPG 密钥
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        
        # 添加 Docker 仓库
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # 安装 Docker
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        log_error "不支持的操作系统: $OS"
        exit 1
    fi
    
    # 添加用户到 docker 组
    sudo usermod -aG docker $USER
    
    log_success "Docker 安装完成"
}

# 安装 Docker Compose (独立版本)
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose 已安装: $(docker-compose --version)"
        return
    fi
    
    log_info "安装 Docker Compose..."
    
    # 下载 Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose 安装完成"
}

# 克隆项目
clone_project() {
    PROJECT_DIR="$HOME/schedule-system"
    
    if [ -d "$PROJECT_DIR" ]; then
        log_warning "项目目录已存在: $PROJECT_DIR"
        read -p "是否删除并重新克隆？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_DIR"
        else
            cd "$PROJECT_DIR"
            git pull
            return
        fi
    fi
    
    log_info "克隆项目..."
    git clone https://github.com/weixin008/schedule.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    log_success "项目克隆完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    if [ ! -f ".env" ]; then
        cp .env.docker .env
        
        # 生成随机 JWT 密钥
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        
        log_success "环境变量配置完成"
    else
        log_info "环境变量文件已存在，跳过配置"
    fi
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        sudo ufw allow 22/tcp comment 'SSH'
        sudo ufw allow 80/tcp comment 'HTTP'
        sudo ufw allow 443/tcp comment 'HTTPS'
        sudo ufw --force enable
        log_success "UFW 防火墙配置完成"
        
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
        log_success "firewalld 防火墙配置完成"
        
    else
        log_warning "未检测到防火墙，请手动配置开放 80 和 443 端口"
    fi
}

# 启动服务
start_services() {
    log_info "启动排班系统..."
    
    # 确保脚本可执行
    chmod +x docker-deploy.sh
    
    # 启动服务
    ./docker-deploy.sh start
    
    if [ $? -eq 0 ]; then
        log_success "服务启动成功！"
    else
        log_error "服务启动失败，请查看日志"
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 部署完成！"
    echo "=============="
    echo ""
    echo "📍 访问地址:"
    echo "   前端界面: http://$SERVER_IP"
    echo "   API 接口: http://$SERVER_IP:9020/api"
    echo ""
    echo "👤 默认账号:"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo ""
    echo "🔧 管理命令:"
    echo "   查看状态: ./docker-deploy.sh status"
    echo "   查看日志: ./docker-deploy.sh logs"
    echo "   重启服务: ./docker-deploy.sh restart"
    echo "   停止服务: ./docker-deploy.sh stop"
    echo ""
    echo "📁 项目目录: $PROJECT_DIR"
    echo ""
    echo "⚠️  重要提醒:"
    echo "   1. 首次登录后请立即修改默认密码"
    echo "   2. 生产环境建议配置 HTTPS"
    echo "   3. 定期备份数据: ./docker-deploy.sh backup"
    echo ""
}

# 主函数
main() {
    log_info "开始部署排班系统..."
    
    detect_os
    check_root
    
    # 安装依赖
    install_docker
    install_docker_compose
    
    # 部署项目
    clone_project
    setup_environment
    setup_firewall
    start_services
    
    # 显示部署信息
    show_deployment_info
    
    log_success "部署完成！请访问上述地址开始使用系统。"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"