# 🚀 值班排班系统 - 部署指南

## 📋 部署概述

本系统是一个基于React的现代化值班排班管理系统，支持用户注册登录、权限管理、排班管理等功能。系统采用前端本地存储，无需后端服务器，可直接部署到任何静态网站托管服务。

## 🌐 支持的部署平台

### 1. Vercel (推荐)
- 免费托管
- 自动部署
- 全球CDN
- 支持自定义域名

### 2. Netlify
- 免费托管
- 自动部署
- 表单处理
- 支持自定义域名

### 3. GitHub Pages
- 免费托管
- 与GitHub集成
- 支持自定义域名

### 4. 阿里云OSS + CDN
- 国内访问速度快
- 支持HTTPS
- 成本低廉

### 5. 腾讯云COS + CDN
- 国内访问速度快
- 支持HTTPS
- 成本低廉

## 🛠️ 部署步骤

### 方法一：Vercel部署 (推荐)

1. **准备代码**
```bash
# 构建生产版本
npm run build
```

2. **上传到GitHub**
```bash
git add .
git commit -m "准备部署"
git push origin main
```

3. **Vercel部署**
- 访问 [vercel.com](https://vercel.com)
- 使用GitHub账号登录
- 点击 "New Project"
- 选择你的GitHub仓库
- 点击 "Deploy"

4. **配置环境变量** (可选)
- 在Vercel项目设置中添加环境变量
- 配置自定义域名

### 方法二：Netlify部署

1. **构建项目**
```bash
npm run build
```

2. **部署到Netlify**
- 访问 [netlify.com](https://netlify.com)
- 注册/登录账号
- 点击 "New site from Git"
- 选择GitHub仓库
- 设置构建命令: `npm run build`
- 设置发布目录: `build`
- 点击 "Deploy site"

### 方法三：GitHub Pages部署

1. **安装gh-pages**
```bash
npm install --save-dev gh-pages
```

2. **修改package.json**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  },
  "homepage": "https://yourusername.github.io/your-repo-name"
}
```

3. **部署**
```bash
npm run deploy
```

### 方法四：阿里云OSS部署

1. **构建项目**
```bash
npm run build
```

2. **上传到OSS**
- 登录阿里云控制台
- 创建OSS Bucket
- 设置Bucket为静态网站托管
- 上传build目录下的所有文件
- 配置CDN加速

3. **配置域名**
- 绑定自定义域名
- 配置HTTPS证书
- 设置CORS规则

## 🔐 安全配置

### 1. HTTPS配置
- 所有部署平台都支持HTTPS
- 建议强制使用HTTPS
- 配置HSTS头

### 2. CSP配置
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

### 3. 环境变量
```bash
# 生产环境变量
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
```

## 📱 移动端优化

系统已针对移动端进行了全面优化：

### 响应式设计
- 支持各种屏幕尺寸
- 移动端友好的界面
- 触摸优化的交互

### PWA支持
- 可安装为应用
- 离线缓存
- 推送通知

### 性能优化
- 代码分割
- 懒加载
- 图片优化

## 🔧 自定义配置

### 1. 修改系统名称
编辑 `src/App.js` 中的系统名称

### 2. 修改默认主题
编辑 `src/utils/themes.js` 中的主题配置

### 3. 修改默认管理员账户
编辑 `src/services/localStorageService.js` 中的 `initializeDefaultAdmin` 方法

### 4. 添加自定义功能
- 在 `src/components/` 中添加新组件
- 在 `src/App.js` 中注册新功能
- 更新路由配置

## 📊 监控和分析

### 1. 访问统计
- 集成Google Analytics
- 使用百度统计
- 配置访问日志

### 2. 错误监控
- 集成Sentry
- 配置错误上报
- 设置告警通知

### 3. 性能监控
- 使用Lighthouse
- 配置性能指标
- 监控加载时间

## 🔄 更新部署

### 1. 代码更新
```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建新版本
npm run build
```

### 2. 自动部署
- 配置CI/CD流水线
- 设置自动构建
- 配置部署通知

### 3. 回滚策略
- 保留历史版本
- 配置快速回滚
- 设置健康检查

## 🆘 常见问题

### 1. 构建失败
- 检查Node.js版本
- 清理node_modules
- 检查依赖冲突

### 2. 部署失败
- 检查构建命令
- 验证发布目录
- 查看部署日志

### 3. 访问异常
- 检查域名配置
- 验证HTTPS证书
- 查看CDN配置

### 4. 性能问题
- 优化图片大小
- 启用Gzip压缩
- 配置缓存策略

## 📞 技术支持

如果在部署过程中遇到问题，可以：

1. 查看项目文档
2. 提交Issue到GitHub
3. 联系技术支持

## 📝 更新日志

### v1.0.0 (2024-01-01)
- ✅ 初始版本发布
- ✅ 用户认证系统
- ✅ 排班管理功能
- ✅ 移动端适配
- ✅ 多主题支持

---

**注意**: 本系统使用本地存储，数据保存在用户浏览器中。建议定期备份重要数据。

# 部署指南（Vercel + MongoDB Atlas 全栈方案）

## 1. 准备工作

- 注册 [MongoDB Atlas](https://www.mongodb.com/atlas/database) 并创建数据库，获取连接字符串（如：`mongodb+srv://...`）。
- 注册 [Vercel](https://vercel.com/) 账号。
- 将本项目代码推送到 GitHub、Gitee 或其他 Git 仓库。

## 2. 配置环境变量（Vercel 项目设置）

在 Vercel 项目设置中添加如下环境变量：

- `MONGODB_URI`：你的 MongoDB Atlas 连接字符串
- `JWT_SECRET`：任意复杂字符串（如 `my_super_secret_123`）

## 3. 代码结构说明

- `/api` 目录：所有后端 API（Serverless Functions），如用户、人员、排班、规则、岗位等 CRUD。
- `/src` 目录：前端 React 代码，所有数据操作通过 `/api` 端点访问。
- `src/services/apiService.js`：统一 API 调用层。
- `src/services/hybridStorageService.js`：业务服务层，前端页面只需调用此层方法。

## 4. 一键部署流程

1. **Fork/Clone 本项目并推送到你的 Git 仓库**
2. **在 Vercel 新建项目，选择你的仓库**
3. **设置环境变量（见第2步）**
4. **点击 Deploy，一键部署**
5. **访问 Vercel 分配的域名，注册/登录/管理数据**

## 5. 管理员与邀请码

- 默认管理员账户：`admin` / `admin123`
- 普通用户注册需邀请码：`zhineng2025`
- 所有数据均存储在 MongoDB Atlas，安全可靠

## 6. 常见问题

- **API 403/401**：请检查 JWT_SECRET 是否一致，前端请求是否带 token。
- **MongoDB 连接失败**：请检查 MONGODB_URI 是否正确，IP白名单是否开放。
- **功能缺失/报错**：请确保所有 API 端点和前端服务层方法已补全。

## 7. 其他说明

- 支持本地开发：`npm install && npm run dev`，需本地设置 `.env` 文件（同上环境变量）。
- 支持自动扩容、免费额度充足，适合中小团队和演示环境。
- 如需扩展业务对象、权限、批量导入导出等，可直接补充 `/api` 端点和前端服务层。

---

如有任何部署或使用问题，请联系项目维护者或在 Issues 区留言。 