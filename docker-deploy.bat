@echo off
setlocal enabledelayedexpansion

REM 排班系统 Docker 一键部署脚本 (Windows)
REM Usage: docker-deploy.bat [start|stop|restart|logs|status]

set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=start

echo 🐳 排班系统 Docker 部署管理
echo ================================

REM 检查 Docker 和 Docker Compose
:check_docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker 未安装，请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose 未安装，请先安装 Docker Compose
    pause
    exit /b 1
)

echo ✅ Docker 环境检查通过

REM 创建环境变量文件
:setup_env
if not exist ".env" (
    echo 📝 创建环境变量文件...
    copy ".env.docker" ".env"
    echo ✅ 已创建 .env 文件，请根据需要修改配置
    echo 💡 提示: 生产环境请务必修改 JWT_SECRET
)

REM 根据命令执行不同操作
if "%COMMAND%"=="start" goto start_services
if "%COMMAND%"=="stop" goto stop_services
if "%COMMAND%"=="restart" goto restart_services
if "%COMMAND%"=="logs" goto show_logs
if "%COMMAND%"=="status" goto show_status
if "%COMMAND%"=="cleanup" goto cleanup
if "%COMMAND%"=="update" goto update_services

echo 使用方法: %0 [start^|stop^|restart^|logs^|status^|cleanup^|update]
echo.
echo 命令说明:
echo   start   - 启动服务
echo   stop    - 停止服务
echo   restart - 重启服务
echo   logs    - 查看日志
echo   status  - 查看状态
echo   cleanup - 清理资源
echo   update  - 更新服务
pause
exit /b 1

:start_services
echo 🚀 启动排班系统...

call :setup_env

REM 构建并启动服务
echo 🔨 构建 Docker 镜像...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo ❌ 镜像构建失败
    pause
    exit /b 1
)

echo 🚀 启动容器...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ 容器启动失败
    pause
    exit /b 1
)

echo ⏳ 等待服务启动...
timeout /t 10 /nobreak >nul

REM 检查服务状态
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo ✅ 服务启动成功！
    echo.
    echo 🌐 访问地址:
    echo   前端界面: http://localhost
    echo   后端API:  http://localhost:9020/api
    echo.
    echo 📊 服务状态:
    docker-compose ps
) else (
    echo ❌ 服务启动失败，请查看日志:
    docker-compose logs
    pause
    exit /b 1
)
goto end

:stop_services
echo 🛑 停止排班系统...
docker-compose down
echo ✅ 服务已停止
goto end

:restart_services
echo 🔄 重启排班系统...
call :stop_services
call :start_services
goto end

:show_logs
echo 📋 查看服务日志...
docker-compose logs -f --tail=100
goto end

:show_status
echo 📊 服务状态:
docker-compose ps
echo.
echo 💾 存储卷:
docker volume ls | findstr schedule
echo.
echo 🌐 网络:
docker network ls | findstr schedule
goto end

:cleanup
echo 🧹 清理 Docker 资源...
set /p confirm="⚠️  这将删除所有容器、镜像和数据卷，确定继续吗？(y/N): "
if /i "%confirm%"=="y" (
    docker-compose down -v --rmi all
    echo ✅ 清理完成
) else (
    echo ❌ 取消清理
)
goto end

:update_services
echo 🔄 更新排班系统...

REM 拉取最新代码 (如果是 git 仓库)
if exist ".git" (
    echo 📥 拉取最新代码...
    git pull
)

REM 重新构建并启动
echo 🔨 重新构建镜像...
docker-compose build --no-cache

echo 🚀 重启服务...
docker-compose up -d

echo ✅ 更新完成
goto end

:end
echo 🎉 操作完成！
pause