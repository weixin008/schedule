// 主题配置文件
export const themes = {
  // 默认主题 - 蓝色科技风
  default: {
    name: '默认主题',
    description: '清新蓝色，科技感十足',
    colors: {
      primary: '#1677ff',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f',
      info: '#1677ff'
    },
    token: {
      colorPrimary: '#1677ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1677ff',
      borderRadius: 6,
      fontSize: 14,
      // 背景色配置
      colorBgLayout: '#f5f7fa',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      // 文字色配置
      colorText: 'rgba(0, 0, 0, 0.88)',
      colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
      colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
      // 边框色
      colorBorder: '#d9d9d9',
      colorBorderSecondary: '#f0f0f0'
    },
    styles: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      contentBg: '#f5f7fa',
      cardBg: '#ffffff'
    }
  },
  
  // 企业蓝主题 - 商务专业
  business: {
    name: '商务蓝',
    description: '沉稳商务，专业可靠',
    colors: {
      primary: '#2f54eb',
      success: '#52c41a',
      warning: '#fa8c16',
      error: '#f5222d',
      info: '#2f54eb'
    },
    token: {
      colorPrimary: '#2f54eb',
      colorSuccess: '#52c41a',
      colorWarning: '#fa8c16',
      colorError: '#f5222d',
      colorInfo: '#2f54eb',
      borderRadius: 4,
      fontSize: 14,
      // 背景色配置 - 深色商务风
      colorBgLayout: '#f0f2f5',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      // 文字色配置
      colorText: 'rgba(0, 0, 0, 0.85)',
      colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
      colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
      // 边框色
      colorBorder: '#d9d9d9',
      colorBorderSecondary: '#f0f0f0'
    },
    styles: {
      siderBg: '#f0f5ff',
      headerBg: '#ffffff',
      contentBg: '#f0f2f5',
      cardBg: '#ffffff'
    }
  },
  
  // 温暖橙主题 - 活力温暖
  warm: {
    name: '温暖橙',
    description: '温暖活力，朝气蓬勃',
    colors: {
      primary: '#fa8c16',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
      info: '#1677ff'
    },
    token: {
      colorPrimary: '#fa8c16',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#f5222d',
      colorInfo: '#1677ff',
      borderRadius: 8,
      fontSize: 14,
      // 背景色配置 - 温暖橙色调
      colorBgLayout: '#fff7e6',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      // 文字色配置
      colorText: 'rgba(0, 0, 0, 0.88)',
      colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
      colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
      // 边框色
      colorBorder: '#ffe7ba',
      colorBorderSecondary: '#fff2d3'
    },
    styles: {
      siderBg: '#fff7e6',
      headerBg: '#ffffff',
      contentBg: '#fff7e6',
      cardBg: '#ffffff'
    }
  },
  
  // 简约紫主题 - 优雅紫色
  elegant: {
    name: '优雅紫',
    description: '优雅紫色，精致品味',
    colors: {
      primary: '#722ed1',
      success: '#52c41a',
      warning: '#fa8c16',
      error: '#f5222d',
      info: '#722ed1'
    },
    token: {
      colorPrimary: '#722ed1',
      colorSuccess: '#52c41a',
      colorWarning: '#fa8c16',
      colorError: '#f5222d',
      colorInfo: '#722ed1',
      borderRadius: 6,
      fontSize: 14,
      // 背景色配置 - 优雅紫色调
      colorBgLayout: '#f9f0ff',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      // 文字色配置
      colorText: 'rgba(0, 0, 0, 0.88)',
      colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
      colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
      // 边框色
      colorBorder: '#efdbff',
      colorBorderSecondary: '#f6edff'
    },
    styles: {
      siderBg: '#f9f0ff',
      headerBg: '#ffffff',
      contentBg: '#f9f0ff',
      cardBg: '#ffffff'
    }
  }
};

// 默认主题
export const DEFAULT_THEME = 'default';

// 获取当前主题
export const getCurrentTheme = () => {
  const savedTheme = localStorage.getItem('paiban_theme');
  return savedTheme || DEFAULT_THEME;
};

// 保存主题设置
export const saveTheme = (themeKey) => {
  localStorage.setItem('paiban_theme', themeKey);
};

// 获取主题配置
export const getThemeConfig = (themeKey = getCurrentTheme()) => {
  return themes[themeKey] || themes[DEFAULT_THEME];
}; 