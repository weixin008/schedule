import { defineStore } from 'pinia';
import api from '../api';

interface SettingsState {
  roleNameMapping: Record<string, string>;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    roleNameMapping: {},
  }),
  getters: {
    getRoleDisplayName(state) {
      return (systemName: string): string => {
        return state.roleNameMapping[systemName] || systemName;
      };
    },
  },
  actions: {
    async fetchSettings() {
      try {
        const response = await api.get('/system-settings');
        this.roleNameMapping = response.data.roles || {};
      } catch (error) {
        // Use default names if fetch fails
        this.roleNameMapping = {
            admin: 'Admin',
            manager: 'Manager',
            staff: 'Staff',
        };
      }
    },
  },
}); 