#!/bin/bash

# RPM 卸载后脚本
# 清理系统中的排班管理系统相关文件

echo "正在清理排班管理系统..."

# 删除符号链接
if [ -L /usr/local/bin/paiban ]; then
    rm -f /usr/local/bin/paiban
fi

# 更新桌面数据库
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi

# 更新图标缓存
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi

# 银河麒麟桌面环境刷新
if [ -f /etc/kylin-release ] && command -v kbuildsycoca4 >/dev/null 2>&1; then
    kbuildsycoca4 >/dev/null 2>&1 || true
fi

# 深度Deepin桌面环境刷新
if [ -f /etc/deepin-version ] && command -v dde-desktop >/dev/null 2>&1; then
    pkill -USR1 dde-desktop >/dev/null 2>&1 || true
fi

echo "排班管理系统已完全卸载"

exit 0 