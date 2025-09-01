const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// 导入API路由
const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const personnelRoutes = require('./api/personnel');
const positionRoutes = require('./api/positions');
const scheduleRoutes = require('./api/schedules');
const scheduleRuleRoutes = require('./api/schedule-rules');
const dataRoutes = require('./api/data');
const registerRoutes = require('./api/register');
const loginRoutes = require('./api/login');
const validateInviteRoutes = require('./api/validate-invite');
const resetDemoDataRoutes = require('./api/reset-demo-data');

// 注册API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/schedule-rules', scheduleRuleRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/validate-invite', validateInviteRoutes);
app.use('/api/reset-demo-data', resetDemoDataRoutes);

// 处理React路由 - 所有非API请求都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
}); 