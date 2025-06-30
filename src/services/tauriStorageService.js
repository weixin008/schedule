// Web端存储服务 - 专注于浏览器环境
class WebStorageService {
  constructor() {
    this.isWeb = true;
    console.log('使用Web存储服务');
  }

  // 保存数据到localStorage
  async saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`保存数据失败 [${key}]:`, error);
      return false;
    }
  }

  // 从localStorage读取数据
  async loadData(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`读取数据失败 [${key}]:`, error);
      return defaultValue;
    }
  }

  // 检查是否运行在Web环境
  isWebApp() {
    return this.isWeb;
  }

  // 获取数据存储位置信息
  getStorageInfo() {
    return {
      type: 'localStorage',
      location: '浏览器本地存储',
      persistent: false
    };
  }
}

// 创建单例实例
const webStorage = new WebStorageService();

export default webStorage; 