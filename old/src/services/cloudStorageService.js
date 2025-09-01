// 云端存储服务
class CloudStorageService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'https://your-vercel-app.vercel.app/api';
    this.isOnline = navigator.onLine;
    
    // 监听网络状态
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // 检查网络连接
  checkConnection() {
    return this.isOnline;
  }

  // 通用API请求
  async apiRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // 用户管理
  async getUsers() {
    return await this.apiRequest('/users');
  }

  async addUser(user) {
    return await this.apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  }

  async updateUser(id, userData) {
    return await this.apiRequest('/users', {
      method: 'PUT',
      body: JSON.stringify({ id, ...userData })
    });
  }

  async deleteUser(id) {
    return await this.apiRequest('/users', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  // 用户认证
  async authenticateUser(username, password) {
    try {
      const result = await this.apiRequest('/auth', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (result.success) {
        // 保存用户信息到本地
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        return { success: true, user: result.user };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: '网络连接失败' };
    }
  }

  // 通用数据存储
  async getData(collection, userId = null) {
    const params = new URLSearchParams({ collection });
    if (userId) params.append('userId', userId);
    
    return await this.apiRequest(`/data?${params}`);
  }

  async saveData(collection, data) {
    return await this.apiRequest('/data', {
      method: 'POST',
      body: JSON.stringify({ collection, ...data })
    });
  }

  async updateData(collection, id, data) {
    return await this.apiRequest('/data', {
      method: 'PUT',
      body: JSON.stringify({ collection, id, ...data })
    });
  }

  async deleteData(collection, id) {
    return await this.apiRequest('/data', {
      method: 'DELETE',
      body: JSON.stringify({ collection, id })
    });
  }

  // 离线数据同步
  async syncOfflineData() {
    if (!this.isOnline) return;

    const offlineData = JSON.parse(localStorage.getItem('offlineData') || '[]');
    if (offlineData.length === 0) return;

    console.log('开始同步离线数据...');

    for (const item of offlineData) {
      try {
        await this.apiRequest(item.endpoint, {
          method: item.method,
          body: JSON.stringify(item.data)
        });
        console.log('同步成功:', item);
      } catch (error) {
        console.error('同步失败:', item, error);
      }
    }

    // 清除已同步的数据
    localStorage.removeItem('offlineData');
  }

  // 保存离线数据
  saveOfflineData(endpoint, method, data) {
    const offlineData = JSON.parse(localStorage.getItem('offlineData') || '[]');
    offlineData.push({ endpoint, method, data, timestamp: Date.now() });
    localStorage.setItem('offlineData', JSON.stringify(offlineData));
  }

  // 混合存储策略
  async hybridSave(key, data, collection) {
    // 先保存到本地
    localStorage.setItem(key, JSON.stringify(data));

    // 如果在线，同步到云端
    if (this.isOnline) {
      try {
        await this.saveData(collection, { key, data });
      } catch (error) {
        console.error('云端同步失败，保存到离线队列:', error);
        this.saveOfflineData('/data', 'POST', { collection, key, data });
      }
    } else {
      // 离线时保存到离线队列
      this.saveOfflineData('/data', 'POST', { collection, key, data });
    }
  }

  async hybridLoad(key, collection) {
    // 优先从本地加载
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }

    // 本地没有则从云端加载
    if (this.isOnline) {
      try {
        const cloudData = await this.getData(collection);
        const item = cloudData.find(d => d.key === key);
        if (item) {
          // 保存到本地
          localStorage.setItem(key, JSON.stringify(item.data));
          return item.data;
        }
      } catch (error) {
        console.error('云端加载失败:', error);
      }
    }

    return null;
  }

  // 数据导出
  async exportAllData() {
    const collections = ['users', 'employees', 'schedules', 'settings'];
    const allData = {};

    for (const collection of collections) {
      try {
        allData[collection] = await this.getData(collection);
      } catch (error) {
        console.error(`导出${collection}失败:`, error);
        allData[collection] = [];
      }
    }

    return allData;
  }

  // 数据导入
  async importAllData(data) {
    const results = {};

    for (const [collection, items] of Object.entries(data)) {
      results[collection] = [];
      
      for (const item of items) {
        try {
          const result = await this.saveData(collection, item);
          results[collection].push({ success: true, id: result._id });
        } catch (error) {
          results[collection].push({ success: false, error: error.message });
        }
      }
    }

    return results;
  }
}

export default new CloudStorageService(); 