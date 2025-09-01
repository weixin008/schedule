@echo off
setlocal enabledelayedexpansion

REM 排班系统部署脚本 (Windows)
REM Usage: deploy.bat [development|production|docker]

set MODE=%1
if "%MODE%"=="" set MODE=development

echo 🚀 开始部署排班系统 - 模式: %MODE%

REM 检查 Node.js 版本
:check_node_version
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js 18+
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION:~1%") do set MAJOR_VERSION=%%i
if %MAJOR_VERSION% lss 18 (
    echo ❌ Node.js 版本过低，需要 18+，当前版本: %NODE_VERSION%
    exit /b 1
)

echo ✅ Node.js 版本检查通过: %NODE_VERSION%

REM 安装依赖
:install_dependencies
echo 📦 安装依赖...

REM 根目录依赖
call npm install
if %errorlevel% neq 0 exit /b 1

REM 后端依赖
cd schedule-api
call npm install
if %errorlevel% neq 0 exit /b 1
cd ..

REM 前端依赖
cd schedule-ui
call npm install
if %errorlevel% neq 0 exit /b 1
cd ..

echo ✅ 依赖安装完成

REM 构建应用
:build_applications
if "%MODE%"=="development" goto setup_environment
if "%MODE%"=="dev" goto setup_environment

echo 🔨 构建应用...

REM 构建后端
cd schedule-api
call npm run build
if %errorlevel% neq 0 exit /b 1
cd ..

REM 构建前端
cd schedule-ui
call npm run build
if %errorlevel% neq 0 exit /b 1
cd ..

echo ✅ 应用构建完成

REM 设置环境变量
:setup_environment
echo ⚙️ 设置环境变量...

REM 后端环境变量
if not exist "schedule-api\.env" (
    copy "schedule-api\.env.example" "schedule-api\.env"
    echo 📝 已创建 schedule-api\.env，请根据需要修改配置
)

REM 前端环境变量
if not exist "schedule-ui\.env" (
    copy "schedule-ui\.env.example" "schedule-ui\.env"
    echo 📝 已创建 schedule-ui\.env，请根据需要修改配置
)

echo ✅ 环境变量设置完成

REM 根据模式执行不同的部署
if "%MODE%"=="development" goto deploy_development
if "%MODE%"=="dev" goto deploy_development
if "%MODE%"=="production" goto deploy_production
if "%MODE%"=="prod" goto deploy_production
if "%MODE%"=="docker" goto deploy_docker

echo ❌ 未知部署模式: %MODE%
echo 使用方法: %0 [development^|production^|docker]
exit /b 1

:deploy_development
echo 🔧 开发模式部署...
echo ✅ 开发环境部署完成！
echo.
echo 启动命令:
echo   后端: cd schedule-api ^&^& npm run start:dev
echo   前端: cd schedule-ui ^&^& npm run dev
echo.
echo 访问地址: http://localhost:9010
goto end

:deploy_production
echo 🏭 生产模式部署...

REM 检查 PM2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 安装 PM2...
    call npm install -g pm2
    if %errorlevel% neq 0 exit /b 1
)

REM 创建日志目录
if not exist "logs" mkdir logs

REM 启动应用
echo 🚀 启动应用...
call pm2 start ecosystem.config.js --env production
if %errorlevel% neq 0 exit /b 1

echo ✅ 生产环境部署完成！
echo.
echo 管理命令:
echo   查看状态: pm2 status
echo   查看日志: pm2 logs
echo   重启应用: pm2 restart all
echo.
echo 访问地址: http://localhost:9020 (需要配置 Nginx 反向代理)
goto end

:deploy_docker
echo 🐳 Docker 部署...

REM 检查 Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker 未安装，请先安装 Docker
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose 未安装，请先安装 Docker Compose
    exit /b 1
)

REM 构建并启动容器
echo 🔨 构建 Docker 镜像...
call docker-compose build
if %errorlevel% neq 0 exit /b 1

echo 🚀 启动容器...
call docker-compose up -d
if %errorlevel% neq 0 exit /b 1

echo ✅ Docker 部署完成！
echo.
echo 管理命令:
echo   查看状态: docker-compose ps
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo.
echo 访问地址: http://localhost
goto end

:end
echo 🎉 部署完成！
pause