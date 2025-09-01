import { defineStore } from 'pinia';
import api from '@/api';

export const useGroupStore = defineStore('group', {
  state: () => ({
    groups: [],
    loading: false,
    lastUpdated: null
  }),
  
  actions: {
    async fetchGroups() {
      this.loading = true;
      try {
        // 优先尝试从API加载
        const response = await api.get('/group');
        const apiGroups = response.data || [];
        
        // 过滤掉无效预设分组
        const validGroups = apiGroups.filter(group => 
          !['管理组', '技术组'].includes(group.name)
        );
        
        // 更新状态和本地存储
        this.groups = validGroups;
        localStorage.setItem('groups', JSON.stringify(validGroups));
        this.lastUpdated = new Date();
        
        console.log('从API加载编组数据:', validGroups.length);
      } catch (error) {
        console.error('API加载失败，尝试本地存储:', error);
        
        // 降级到本地存储
        try {
          const localGroups = JSON.parse(localStorage.getItem('groups') || '[]');
          this.groups = localGroups.filter(group => 
            !['管理组', '技术组'].includes(group.name)
          );
          console.log('从本地存储加载编组数据:', this.groups.length);
        } catch (parseError) {
          console.error('解析本地存储数据失败:', parseError);
          this.groups = [];
        }
      } finally {
        this.loading = false;
      }
    },
    
    async refreshIfStale() {
      // 如果超过5分钟未更新或数据为空，则刷新
      const now = new Date();
      if (
        !this.lastUpdated || 
        now - this.lastUpdated > 300000 || 
        this.groups.length === 0
      ) {
        await this.fetchGroups();
      }
    },
    
    getGroupById(id) {
      return this.groups.find(group => group.id === id);
    },
    
    async addGroup(groupData) {
      try {
        const response = await api.post('/group', groupData);
        const newGroup = response.data;
        
        // 更新状态
        this.groups.push(newGroup);
        localStorage.setItem('groups', JSON.stringify(this.groups));
        
        return newGroup;
      } catch (error) {
        console.error('添加编组失败:', error);
        throw error;
      }
    },
    
    async updateGroup(updatedGroup) {
      try {
        await api.put(`/group/${updatedGroup.id}`, updatedGroup);
        
        // 更新状态
        const index = this.groups.findIndex(g => g.id === updatedGroup.id);
        if (index !== -1) {
          this.groups[index] = updatedGroup;
          localStorage.setItem('groups', JSON.stringify(this.groups));
        }
      } catch (error) {
        console.error('更新编组失败:', error);
        throw error;
      }
    },
    
    async deleteGroup(groupId) {
      try {
        await api.delete(`/group/${groupId}`);
        
        // 更新状态
        this.groups = this.groups.filter(group => group.id !== groupId);
        localStorage.setItem('groups', JSON.stringify(this.groups));
      } catch (error) {
        console.error('删除编组失败:', error);
        throw error;
      }
    }
  },
  
  getters: {
    groupMap: (state) => {
      return new Map(state.groups.map(group => [group.id, group]));
    },
    
    getGroupName: (state) => (id) => {
      const group = state.groups.find(g => g.id === id);
      return group ? group.name : `编组${id}`;
    }
  }
});