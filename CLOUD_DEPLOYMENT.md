# 云端部署指南

## 概述
本指南将帮助你将排班系统部署到云端，实现数据永久保存和多设备同步。

## 方案选择

### 推荐方案：Vercel + MongoDB Atlas
- ✅ 完全免费
- ✅ 中国大陆访问速度快
- ✅ 部署简单
- ✅ 自动HTTPS

## 部署步骤

### 1. 创建MongoDB Atlas数据库

1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 注册账户并登录
3. 创建新集群：
   - 选择 "FREE" 计划 (M0)
   - 选择云提供商：AWS
   - 选择地区：选择离中国最近的地区（如新加坡）
   - 点击 "Create"

4. 设置数据库访问：
   - 创建数据库用户
   - 用户名：`paiban_admin`
   - 密码：生成强密码并保存
   - 权限：`Read and write to any database`

5. 设置网络访问：
   - 点击 "Network Access"
   - 点击 "Add IP Address"
   - 选择 "Allow Access from Anywhere" (0.0.0.0/0)

6. 获取连接字符串：
   - 点击 "Connect"
   - 选择 "Connect your application"
   - 复制连接字符串
   - 替换 `<password>` 为你的密码

### 2. 部署到Vercel

1. 安装Vercel CLI：
```bash
npm install -g vercel
```

2. 登录Vercel：
```bash
vercel login
```

3. 设置环境变量：
```bash
vercel env add MONGODB_URI
# 输入你的MongoDB连接字符串
```

4. 部署项目：
```bash
vercel --prod
```

5. 获取部署URL：
部署完成后，你会得到一个类似 `https://your-app.vercel.app` 的URL

### 3. 配置前端

1. 创建 `.env` 文件：
```env
REACT_APP_API_URL=https://your-app.vercel.app/api
```

2. 更新 `src/services/cloudStorageService.js` 中的 `baseURL`

### 4. 测试部署

1. 访问你的应用URL
2. 注册新用户
3. 测试数据保存和同步

## 数据迁移

### 从本地存储迁移到云端

1. 导出本地数据：
```javascript
// 在浏览器控制台执行
const localData = {
  users: JSON.parse(localStorage.getItem('system_users') || '[]'),
  employees: JSON.parse(localStorage.getItem('duty_employees') || '[]'),
  schedules: JSON.parse(localStorage.getItem('duty_schedules') || '[]'),
  settings: JSON.parse(localStorage.getItem('duty_settings') || '{}')
};

// 下载数据文件
const dataStr = JSON.stringify(localData, null, 2);
const blob = new Blob([dataStr], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'paiban_backup.json';
a.click();
```

2. 导入到云端：
```javascript
// 使用应用的数据导入功能
// 或通过API直接导入
```

## 监控和维护

### 查看日志
```bash
vercel logs
```

### 查看数据库
- 登录MongoDB Atlas控制台
- 查看数据集合和文档

### 备份数据
```bash
# 导出数据库
mongodump --uri="your-mongodb-uri" --out=backup
```

## 故障排除

### 常见问题

1. **API 404错误**
   - 检查 `vercel.json` 配置
   - 确认API文件路径正确

2. **数据库连接失败**
   - 检查MongoDB Atlas网络设置
   - 确认连接字符串正确

3. **CORS错误**
   - 检查API中的CORS设置
   - 确认域名配置正确

### 性能优化

1. **启用缓存**
```javascript
// 在API中添加缓存头
res.setHeader('Cache-Control', 'public, max-age=300');
```

2. **数据库索引**
```javascript
// 在MongoDB Atlas中创建索引
db.users.createIndex({ "username": 1 });
db.schedules.createIndex({ "date": 1 });
```

## 成本控制

### 免费额度
- **Vercel**: 100GB带宽/月
- **MongoDB Atlas**: 512MB存储

### 超出免费额度的处理
1. 监控使用量
2. 优化数据存储
3. 考虑升级计划

## 安全建议

1. **环境变量**
   - 不要在代码中硬编码敏感信息
   - 使用Vercel环境变量

2. **数据库安全**
   - 定期更换数据库密码
   - 限制IP访问范围

3. **API安全**
   - 添加请求频率限制
   - 实现用户认证

## 扩展功能

### 添加更多API端点
```javascript
// api/statistics.js
export default async function handler(req, res) {
  // 统计功能
}
```

### 集成第三方服务
- 邮件通知
- 短信提醒
- 文件存储

## 联系支持

如果遇到问题：
1. 查看Vercel文档
2. 查看MongoDB Atlas文档
3. 提交GitHub Issue

---

部署完成后，你的应用将具备：
- ✅ 数据永久保存
- ✅ 多设备同步
- ✅ 离线支持
- ✅ 自动备份
- ✅ 高可用性 