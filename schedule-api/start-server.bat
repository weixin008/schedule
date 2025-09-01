@echo off
echo 启动排班系统后端服务器...
echo 端口: 9020
echo.

cd /d "%~dp0"
echo 当前目录: %CD%
echo.

echo 正在启动 NestJS 开发服务器...
call npm run start:dev

pause