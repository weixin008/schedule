# 🚀 值班排班管理系统

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.x-1890ff.svg)](https://ant.design/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://www.javascript.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

一个功能完整、界面美观的现代化值班排班管理系统，专为企业、机构、团队的人员值班安排而设计。

## 📋 目录

- [项目概述](#-项目概述)
- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [系统截图](#-系统截图)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [核心功能详解](#-核心功能详解)
- [主题系统](#-主题系统)
- [使用指南](#-使用指南)
- [开发说明](#-开发说明)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

## 🎯 项目概述

值班排班管理系统是一个基于React和Ant Design开发的现代化Web应用，旨在简化企业和机构的人员值班安排工作。系统提供了直观的可视化界面，支持灵活的排班规则配置，让值班管理变得高效且轻松。

### 🌟 核心亮点

- 🎨 **四套精美主题** - 默认蓝、商务蓝、温暖橙、优雅紫
- 📅 **灵活排班规则** - 支持每日轮换、每周轮换等多种模式
- 👥 **完整人员管理** - 支持人员分组、标签管理、状态跟踪
- 📊 **可视化日历** - 直观的排班日历展示
- 🔧 **系统配置** - 支持工作日设置、时间配置等
- 💾 **本地存储** - 数据保存在浏览器本地，无需服务器

## ✨ 功能特性

### 📊 仪表盘
- 排班统计概览
- 人员状态汇总
- 系统运行状态监控
- 快捷操作入口

### 👤 人员管理
- ➕ 添加/编辑/删除人员信息
- 🏷️ 人员标签管理（正式员工、实习生、临时工等）
- 📋 人员状态管理（在职、请假、离职等）
- 🔍 人员搜索和筛选功能
- 📤 数据导入导出

### 🏢 岗位设置
- 🎯 岗位创建和管理
- 👥 人员分配到岗位
- 📊 岗位人员统计
- ⬆️⬇️ 岗位排序调整

### ⚙️ 轮班规则
- 🔄 **每日轮换**：按人员顺序每日轮换值班
- 📅 **每周轮换**：按周为单位安排值班人员
- ⏰ 自定义工作时间设置
- 📋 规则优先级管理

### 📅 排班日历
- 📆 月度日历视图
- 🎨 不同岗位颜色区分
- ✏️ 直接点击修改排班
- 📄 排班表导出功能

### ⚙️ 系统设置
- 🏢 机构信息配置
- 📞 联系人信息管理
- 🗓️ 工作日设置
- ⏰ 工作时间配置
- 🔔 通知设置

### 🎨 主题系统
- 🔵 **默认主题** - 清新蓝色，科技感十足
- 💼 **商务蓝** - 沉稳商务，专业可靠
- 🧡 **温暖橙** - 温暖活力，朝气蓬勃
- 💜 **优雅紫** - 优雅紫色，精致品味

## 🛠️ 技术栈

### 前端框架
- **React 18.x** - 现代化前端框架
- **JavaScript ES6+** - 现代JavaScript语法
- **Create React App** - 项目脚手架

### UI组件库
- **Ant Design 5.x** - 企业级UI设计语言
- **Ant Design Icons** - 丰富的图标库

### 样式方案
- **CSS3** - 现代CSS特性
- **Ant Design主题系统** - 动态主题切换
- **响应式设计** - 适配多种屏幕尺寸

### 数据管理
- **React Hooks** - 现代状态管理
- **LocalStorage** - 浏览器本地存储
- **JSON** - 数据序列化格式

### 开发工具
- **npm** - 包管理工具
- **Webpack** - 模块打包工具
- **Babel** - JavaScript编译器

## 🖼️ 系统截图

### 主界面
![主界面](./docs/images/dashboard.png)

### 人员管理
![人员管理](./docs/images/personnel.png)

### 排班日历
![排班日历](./docs/images/calendar.png)

### 主题切换
![主题切换](./docs/images/themes.png)

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/paiban-system.git
cd paiban-system
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm start
```

4. **访问应用**
```
打开浏览器访问 http://localhost:3000
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run serve
```

## 📁 项目结构

```
paiban2/
├── public/                 # 静态资源
│   └── index.html         # HTML模板
├── src/                   # 源代码
│   ├── components/        # React组件
│   │   ├── Dashboard.js           # 仪表盘
│   │   ├── PersonnelManagement.js # 人员管理
│   │   ├── PositionSetup.js       # 岗位设置
│   │   ├── ScheduleRules.js       # 轮班规则
│   │   ├── ScheduleCalendar.js    # 排班日历
│   │   ├── SystemSettings.js      # 系统设置
│   │   └── ThemeSelector.js       # 主题选择器
│   ├── services/          # 服务层
│   │   └── localStorageService.js # 本地存储服务
│   ├── utils/             # 工具函数
│   │   └── themes.js      # 主题配置
│   ├── App.js             # 主应用组件
│   ├── App.css            # 主样式文件
│   └── index.js           # 应用入口
├── package.json           # 项目配置
└── README.md             # 项目说明
```

## 🔧 核心功能详解

### 排班算法

#### 每日轮换算法
```javascript
// 按人员顺序循环分配
const assignDailyRotation = (date, personnel, startIndex) => {
  const daysSinceStart = getDaysBetween(startDate, date);
  const currentIndex = (startIndex + daysSinceStart) % personnel.length;
  return personnel[currentIndex];
};
```

#### 每周轮换算法
```javascript
// 按周分配人员
const assignWeeklyRotation = (date, personnel, startIndex) => {
  const weeksSinceStart = getWeeksBetween(startDate, date);
  const currentIndex = (startIndex + weeksSinceStart) % personnel.length;
  return personnel[currentIndex];
};
```

### 数据持久化

系统使用LocalStorage进行数据持久化，支持以下数据类型：
- 人员信息
- 岗位配置
- 排班规则
- 系统设置
- 主题配置

```javascript
// 数据保存示例
const saveData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// 数据读取示例
const loadData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};
```

## 🎨 主题系统

### 主题配置结构

```javascript
const theme = {
  name: '主题名称',
  description: '主题描述',
  colors: {
    primary: '#1677ff',    // 主色
    success: '#52c41a',    // 成功色
    warning: '#faad14',    // 警告色
    error: '#ff4d4f',      // 错误色
  },
  token: {
    colorPrimary: '#1677ff',
    colorBgLayout: '#f5f7fa',
    colorBgContainer: '#ffffff',
    // ... 更多Ant Design配置
  },
  styles: {
    siderBg: '#ffffff',    // 侧边栏背景
    headerBg: '#ffffff',   // 头部背景
    contentBg: '#f5f7fa',  // 内容区背景
    cardBg: '#ffffff',     # 卡片背景
  }
};
```

### 主题切换机制

1. 用户点击主题选择器
2. 系统更新React状态
3. ConfigProvider应用新主题配置
4. CSS类名动态切换
5. 主题配置保存到LocalStorage

## 📖 使用指南

### 首次使用

1. **系统初始化**
   - 首次访问会弹出设置向导
   - 输入机构名称等基本信息
   - 系统自动完成初始化

2. **添加人员**
   - 进入"人员管理"页面
   - 点击"添加人员"按钮
   - 填写人员基本信息和标签

3. **设置岗位**
   - 进入"岗位设置"页面
   - 创建需要值班的岗位
   - 将人员分配到对应岗位

4. **配置排班规则**
   - 进入"轮班规则"页面
   - 选择轮班方式（每日/每周）
   - 设置起始时间和人员顺序

5. **查看排班表**
   - 进入"排班日历"页面
   - 查看自动生成的排班安排
   - 可手动调整特殊安排

### 高级功能

#### 批量导入人员
```javascript
// 支持JSON格式批量导入
const personnelData = [
  { name: "张三", position: "开发", tags: ["正式员工"], status: "在职" },
  { name: "李四", position: "测试", tags: ["实习生"], status: "在职" }
];
```

#### 自定义排班规则
- 支持跳过周末
- 支持节假日特殊安排
- 支持人员请假处理

## 💡 开发说明

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 运行测试
npm test

# 代码检查
npm run lint
```

### 代码规范

- 使用ES6+语法
- 组件采用函数式组件 + Hooks
- 遵循Ant Design设计规范
- 注释清晰，代码可读性强

### 性能优化

- 组件懒加载
- 数据缓存机制
- 虚拟滚动（大数据量时）
- 图片资源优化

## 🤝 贡献指南

我们欢迎任何形式的贡献！

### 贡献方式

1. Fork本项目
2. 创建feature分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. Push到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 报告问题

如果您发现bug或有功能建议，请：

1. 检查是否已有相关Issue
2. 创建详细的Issue描述
3. 提供复现步骤（如果是bug）
4. 提供预期行为描述

### 开发计划

- [ ] 移动端适配优化
- [ ] 数据导出功能增强
- [ ] 多语言支持
- [ ] 云端数据同步
- [ ] 消息通知系统
- [ ] 统计报表功能

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 👨‍💻 作者

**个人开发项目**
- 如有问题或建议，欢迎提交Issue
- 感谢您的使用和支持！

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [Ant Design](https://ant.design/) - UI组件库
- [Create React App](https://create-react-app.dev/) - 项目脚手架

---

⭐ 如果这个项目对您有帮助，请给个Star支持一下！

📧 联系方式：[your-email@example.com](mailto:your-email@example.com)

🌐 项目主页：[https://github.com/yourusername/paiban-system](https://github.com/yourusername/paiban-system) t r i g g e r   r e d e p l o y  
 