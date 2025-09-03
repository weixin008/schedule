<template>
  <div class="kanban-container">
    <div v-if="!authenticated" class="password-overlay">
      <div class="password-box">
        <h2>请输入密码</h2>
        <input type="password" v-model="password" @keyup.enter="authenticate" placeholder="密码" />
        <button @click="authenticate">进入看板</button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>
    </div>
    <div v-else class="kanban-content">
      <!-- 这里将显示仪表盘数据 -->
      <h1>排班看板</h1>
      <p>数据加载中...</p>
      <!-- 示例数据展示 -->
      <div class="data-section">
        <h3>人员概览</h3>
        <p>总人数: {{ dashboardData.personnelCount }}</p>
        <ul>
          <li v-for="person in dashboardData.personnel" :key="person.name">{{ person.name }}</li>
        </ul>
      </div>
      <div class="data-section">
        <h3>今日值班</h3>
        <p>班次: {{ dashboardData.todayShifts.length }}</p>
        <ul>
          <li v-for="shift in dashboardData.todayShifts" :key="shift.id">{{ shift.name }} - {{ shift.personnel.join(', ') }}</li>
        </ul>
      </div>
      <div class="data-section">
        <h3>冲突信息</h3>
        <p>冲突数量: {{ dashboardData.conflictCount }}</p>
        <ul>
          <li v-for="conflict in dashboardData.conflicts" :key="conflict.id">{{ conflict.description }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import apiService from '@/api';

export default {
  name: 'KanbanView',
  data() {
    return {
      password: '',
      authenticated: false,
      error: '',
      dashboardData: {
        personnelCount: 0,
        personnel: [],
        todayShifts: [],
        conflictCount: 0,
        conflicts: [],
      },
      guestUsername: 'guest', // 预设的只读用户名
      guestPassword: 'dcd7527756', // 预设的只读密码
      token: null,
    };
  },
  methods: {
    async authenticate() {
      this.error = '';
      if (this.password !== this.guestPassword) {
        this.error = '密码错误，请重试。';
        return;
      }

      try {
        // 模拟登录获取Token
        const response = await apiService.post('/auth/login', {
          username: this.guestUsername,
          password: this.password,
        });
        this.token = response.data.token; // 假设token在response.data.token
        localStorage.setItem('kanban_token', this.token); // 临时存储token

        this.authenticated = true;
        this.fetchDashboardData(); // 认证成功后获取数据
      } catch (err) {
        console.error('认证失败:', err);
        this.error = '认证失败，请检查用户名或密码。';
        // 如果是401/403，可能是guest用户不存在或密码错误
        if (err.response && err.response.status === 401) {
          this.error = '认证失败：guest用户不存在或密码错误。';
        }
      }
    },
    async fetchDashboardData() {
      // 假设后端有对应的API来获取这些数据
      // 这里需要根据实际后端API进行调整
      try {
        // 示例：获取人员总数和列表
        const personnelResponse = await apiService.get('/personnel', {
          headers: { Authorization: `Bearer ${this.token}` }
        });
        this.dashboardData.personnel = personnelResponse.data.map(p => ({ name: p.name })); // 假设返回的是包含name的数组
        this.dashboardData.personnelCount = personnelResponse.data.length;

        // 示例：获取今日值班
        const shiftsResponse = await apiService.get('/shifts/today', { // 假设有/shifts/today接口
          headers: { Authorization: `Bearer ${this.token}` }
        });
        this.dashboardData.todayShifts = shiftsResponse.data.map(s => ({
          id: s.id,
          name: s.shiftName, // 假设有shiftName
          personnel: s.assignedPersonnel.map(p => p.name) // 假设有assignedPersonnel
        }));

        // 示例：获取冲突信息
        const conflictsResponse = await apiService.get('/conflicts/current', { // 假设有/conflicts/current接口
          headers: { Authorization: `Bearer ${this.token}` }
        });
        this.dashboardData.conflictCount = conflictsResponse.data.length;
        this.dashboardData.conflicts = conflictsResponse.data.map(c => ({
          id: c.id,
          description: c.description, // 假设有description
        }));

      } catch (err) {
        console.error('获取看板数据失败:', err);
        this.error = '获取数据失败，请联系管理员。';
      }
    },
  },
  mounted() {
    // 尝试从localStorage恢复token，如果存在则直接认证
    const storedToken = localStorage.getItem('kanban_token');
    if (storedToken) {
      this.token = storedToken;
      this.authenticated = true;
      this.fetchDashboardData();
    }
  }
};
</script>

<style scoped>
.kanban-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  font-family: Arial, sans-serif;
}

.password-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.password-box {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.password-box h2 {
  margin-bottom: 20px;
  color: #333;
}

.password-box input {
  width: 250px;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.password-box button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.password-box button:hover {
  background-color: #0056b3;
}

.error-message {
  color: red;
  margin-top: 10px;
}

.kanban-content {
  width: 90%;
  max-width: 1200px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kanban-content h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.data-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  background-color: #f9f9f9;
}

.data-section h3 {
  color: #007bff;
  margin-top: 0;
  margin-bottom: 10px;
}

.data-section ul {
  list-style: none;
  padding: 0;
}

.data-section li {
  padding: 5px 0;
  border-bottom: 1px dashed #eee;
}

.data-section li:last-child {
  border-bottom: none;
}
</style>
