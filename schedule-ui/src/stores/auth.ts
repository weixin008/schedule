import { defineStore } from 'pinia';
import api from '@/api';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: {
    name: string;
  };
  department?: {
    name: string;
  };
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => {
      const roleName = state.user?.role?.name?.toLowerCase()?.trim();
      return roleName === 'admin';
    },
  },
  actions: {
    async login(credentials: { username: string; password: string }) {
      const response = await api.post('/auth/login', credentials);
      const { access_token } = response.data;
      this.token = access_token;
      localStorage.setItem('token', access_token);
      await this.fetchProfile();
    },
    async fetchProfile() {
      if (this.token) {
        try {
          const response = await api.get('/auth/profile');
          
          // 确保角色信息存在
          this.user = {
            ...response.data,
            role: response.data.role ? response.data.role : { name: 'staff' }
          };
        } catch (error) {
          this.logout();
          throw error;
        }
      }
    },
    async updateProfile(updateData: { name?: string; email?: string; phone?: string; password?: string }) {
      try {
        const response = await api.patch('/auth/profile', updateData);
        this.user = response.data;
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
    },
  },
});