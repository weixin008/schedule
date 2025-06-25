#!/bin/bash

# RPM 安装后脚本 - 银河麒麟优化版
# 设置应用程序权限和桌面集成

echo "正在配置排班管理系统..."

# 设置可执行权限
chmod +x /opt/排班管理系统/排班管理系统

# 创建符号链接到 /usr/local/bin (如果不存在)
if [ ! -L /usr/local/bin/paiban ]; then
    ln -sf "/opt/排班管理系统/排班管理系统" /usr/local/bin/paiban
fi

# 更新桌面数据库
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi

# 更新图标缓存
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi

# 银河麒麟特殊处理
if [ -f /etc/kylin-release ]; then
    echo "检测到银河麒麟系统，进行专项优化..."
    
    # 设置银河麒麟桌面环境兼容
    if [ -d /usr/share/applications ]; then
        # 确保桌面文件具有正确的权限
        chmod 644 /usr/share/applications/paiban*.desktop 2>/dev/null || true
    fi
    
    # 银河麒麟桌面环境刷新
    if command -v kbuildsycoca4 >/dev/null 2>&1; then
        kbuildsycoca4 >/dev/null 2>&1 || true
    fi
fi

# 统信UOS特殊处理
if [ -f /etc/uos-release ]; then
    echo "检测到统信UOS系统，进行专项优化..."
    
    # UOS桌面环境刷新
    if command -v gio >/dev/null 2>&1; then
        gio mime --set application/x-paiban-schedule paiban >/dev/null 2>&1 || true
    fi
fi

# 深度Deepin特殊处理
if [ -f /etc/deepin-version ]; then
    echo "检测到深度Deepin系统，进行专项优化..."
    
    # Deepin桌面环境刷新
    if command -v dde-desktop >/dev/null 2>&1; then
        pkill -USR1 dde-desktop >/dev/null 2>&1 || true
    fi
fi

echo "排班管理系统安装完成！"
echo "您可以在应用程序菜单中找到'排班管理系统'，或在终端中运行'paiban'命令启动。"

exit 0 