# 银河麒麟系统构建指南

## 🚀 快速开始

本指南将帮助您在银河麒麟系统上构建排班管理系统的安装包。

### 支持的系统版本

- ✅ 银河麒麟桌面操作系统 V10 (SP1/SP2/SP3)
- ✅ 银河麒麟高级服务器操作系统 V10
- ✅ 统信UOS 20/21/22
- ✅ 深度Deepin 20/23
- ✅ openEuler 20.03/22.03
- ✅ 中标麒麟 7.0

## 📦 构建方式

### 方式一：GitHub Actions 自动构建（推荐）

1. **推送代码触发构建**
   ```bash
   git add .
   git commit -m "update: 银河麒麟适配优化"
   git push origin main
   ```

2. **查看构建状态**
   - 访问：https://github.com/weixin008/paiban/actions
   - 等待构建完成（约10-15分钟）

3. **下载安装包**
   - 构建完成后，在Actions页面下载artifacts
   - 包含：`.deb`、`.rpm`、`.AppImage`格式

### 方式二：本地构建

#### 环境准备

```bash
# 安装Node.js (推荐使用18版本)
sudo yum install nodejs npm -y

# 或者使用官方安装包
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# 验证安装
node --version
npm --version
```

#### 构建步骤

```bash
# 1. 克隆项目
git clone https://github.com/weixin008/paiban.git
cd paiban/paiban-cross-platform

# 2. 安装依赖
npm install --legacy-peer-deps

# 3. 构建Web应用
npm run build

# 4. 安装Electron构建工具
npm install electron electron-builder --save-dev

# 5. 构建所有Linux格式
npm run electron:build:linux

# 或者构建特定格式
npm run electron:build:deb    # 构建.deb包
npm run electron:build:rpm    # 构建.rpm包
npm run electron:build:appimage # 构建AppImage
```

## 📋 安装包说明

### .deb 包（推荐用于Debian系发行版）
- **适用系统**：深度Deepin、统信UOS
- **安装命令**：`sudo dpkg -i paiban-*.deb`
- **卸载命令**：`sudo apt remove paiban`

### .rpm 包（推荐用于RedHat系发行版）
- **适用系统**：银河麒麟、openEuler、中标麒麟
- **安装命令**：`sudo rpm -ivh paiban-*.rpm`
- **卸载命令**：`sudo rpm -e paiban`

### AppImage（通用格式）
- **适用系统**：所有Linux发行版
- **使用方法**：
  ```bash
  chmod +x paiban-*.AppImage
  ./paiban-*.AppImage
  ```

## 🔧 银河麒麟专项优化

### 桌面环境适配
- ✅ UKUI桌面环境完美支持
- ✅ 应用程序菜单自动注册
- ✅ 系统托盘图标显示
- ✅ 中文字体渲染优化

### 系统集成功能
- ✅ 开机自启动选项
- ✅ 系统通知支持
- ✅ 文件关联设置
- ✅ 快捷键全局响应

### 安全认证
- ✅ 通过银河麒麟应用商店认证标准
- ✅ 数字签名验证
- ✅ 安全沙箱运行

## 🚨 常见问题

### Q1: 构建时出现权限错误
```bash
# 解决方案：设置npm权限
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Q2: 缺少依赖库
```bash
# 银河麒麟系统安装依赖
sudo yum install gtk3-devel libnotify-devel nss-devel libXScrnSaver-devel -y

# 深度/UOS系统安装依赖
sudo apt install libgtk-3-dev libnotify-dev libnss3-dev libxss1 -y
```

### Q3: AppImage无法运行
```bash
# 安装FUSE支持
sudo yum install fuse fuse-libs -y

# 或者提取运行
./paiban-*.AppImage --appimage-extract
./squashfs-root/AppRun
```

### Q4: 中文显示异常
```bash
# 安装中文字体
sudo yum install google-noto-cjk-fonts -y
# 或
sudo apt install fonts-noto-cjk -y
```

## 📊 构建输出

构建完成后，在`dist/`目录下会生成：

```
dist/
├── paiban-1.0.0.deb              # Debian包
├── paiban-1.0.0.rpm              # RPM包
├── paiban-1.0.0.AppImage          # AppImage包
├── paiban-1.0.0.tar.gz           # 源码包
├── latest-linux.yml              # 更新配置
└── builder-debug.log             # 构建日志
```

## 🎯 性能优化

### 启动速度优化
- 使用预编译二进制文件
- 启用V8快照缓存
- 延迟加载非关键模块

### 内存占用优化
- 启用进程沙箱
- 优化图片资源大小
- 使用Web Workers

### 银河麒麟特定优化
- 适配ARM64架构
- 优化UKUI主题
- 支持麒麟安全框架

## 📞 技术支持

如果在银河麒麟系统上遇到问题，请：

1. **查看日志**：`~/.config/排班管理系统/logs/`
2. **系统信息**：运行`uname -a`和`cat /etc/kylin-release`
3. **联系支持**：
   - 公众号：豆子爱分享
   - GitHub Issues：https://github.com/weixin008/paiban/issues

## 🔄 更新说明

- **自动更新**：应用内置更新检查功能
- **手动更新**：重新下载安装包覆盖安装
- **配置保留**：更新时自动保留用户配置和数据

---

**注意**：本系统专为中国企业定制，完美适配银河麒麟等国产操作系统。如有定制需求，欢迎联系作者。 