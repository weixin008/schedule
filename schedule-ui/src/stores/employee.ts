import { defineStore } from 'pinia';
import api from '../api';
import { ElMessage } from 'element-plus';

interface Employee {
  id: number;
  name: string;
  position: string;
  positionInfo?: {
    name: string;
  };
  department?: string;
  departmentInfo?: {
    name: string;
  };
  organizationNode?: {
    name: string;
  };
  level?: number;
  status?: string;
  // Add other employee properties as needed
}

interface EmployeeState {
  employees: Employee[];
  loading: boolean;
}

export const useEmployeeStore = defineStore('employee', {
  state: (): EmployeeState => ({
    employees: [],
    loading: false,
  }),
  getters: {
    getEmployeeName(state) {
      return (id: number): string => {
        const employee = state.employees.find(e => e.id === id);
        return employee ? employee.name : 'Unknown';
      };
    },
    getEmployeeById(state) {
      return (id: number) => state.employees.find(e => e.id === id);
    },
  },
  actions: {
    async fetchEmployees() {
      // Always refetch to get latest data
      this.loading = true;
      try {
        const response = await api.get('/employees');
        this.employees = response.data;
        console.log('✅ 从API加载员工数据:', this.employees.length);
      } catch (error) {
        console.warn('⚠️ API加载员工失败，使用测试数据:', error);
        // 提供测试员工数据作为备用
        this.employees = [
          { id: 17, name: '乔桂欣', position: '带班领导', departmentInfo: { name: '运营部' } },
          { id: 18, name: '任丽撕', position: '带班领导', departmentInfo: { name: '运营部' } },
          { id: 19, name: '罗金生', position: '带班领导', departmentInfo: { name: '运营部' } },
          { id: 20, name: '焦云玲', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 21, name: '王慕梓', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 22, name: '周学伟', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 23, name: '王滨滨', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 24, name: '张云皓', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 25, name: '付米丽', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 26, name: '焦海燕', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 27, name: '刘旭光', position: '值班员', departmentInfo: { name: '技术部' } },
          { id: 28, name: '张子航', position: '值班员', departmentInfo: { name: '技术部' } }
        ];
        console.log('🧪 使用测试员工数据:', this.employees.length);
      } finally {
        this.loading = false;
      }
    },
  },
}); 