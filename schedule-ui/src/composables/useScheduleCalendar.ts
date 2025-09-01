import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import apiClient from '@/api';

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    employeeId: number;
    employee: any;
    shift: string;
    notes?: string;
    status?: string;
    isReplacement?: boolean;
    department?: any;
  };
}

export function useScheduleCalendar() {
  const loading = ref(false);
  const events = ref<ScheduleEvent[]>([]);
  const currentMonth = ref(new Date());
  const cache = new Map<string, ScheduleEvent[]>();

  // 根据排班状态获取事件颜色
  const getEventColor = (schedule: any) => {
    if (schedule.status === 'conflict') {
      return '#f56c6c'; // 红色表示冲突
    }
    if (schedule.isReplacement) {
      return '#e6a23c'; // 橙色表示替班
    }
    if (schedule.shift === '夜班') {
      return '#909399'; // 灰色表示夜班
    }
    if (schedule.shift === '早班') {
      return '#67c23a'; // 绿色表示早班
    }
    if (schedule.shift === '晚班') {
      return '#409eff'; // 蓝色表示晚班
    }
    return '#409eff'; // 默认蓝色
  };

  // 获取缓存键
  const getCacheKey = (year: number, month: number) => {
    return `${year}-${month.toString().padStart(2, '0')}`;
  };

  // 获取排班数据
  const fetchSchedules = async (startDate?: Date, endDate?: Date) => {
    loading.value = true;
    
    try {
      // 如果没有指定日期范围，使用当前月份
      if (!startDate || !endDate) {
        const now = currentMonth.value;
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const cacheKey = getCacheKey(startDate.getFullYear(), startDate.getMonth() + 1);
      
      // 检查缓存
      if (cache.has(cacheKey)) {
        events.value = cache.get(cacheKey)!;
        loading.value = false;
        return events.value;
      }

      const params = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      const response = await apiClient.get('/schedules', { params });
      const schedules = response.data || [];
      
      const eventList: ScheduleEvent[] = schedules.map((schedule: any) => ({
        id: schedule.id.toString(),
        title: schedule.title || `${schedule.employee?.name || '未知员工'} - ${schedule.shift || '班次'}`,
        start: schedule.start,
        end: schedule.end,
        backgroundColor: getEventColor(schedule),
        borderColor: getEventColor(schedule),
        extendedProps: {
          employeeId: schedule.employeeId,
          employee: schedule.employee,
          shift: schedule.shift,
          notes: schedule.notes,
          status: schedule.status,
          isReplacement: schedule.isReplacement || false,
          department: schedule.employee?.department
        }
      }));
      
      // 缓存数据
      cache.set(cacheKey, eventList);
      events.value = eventList;
      
      console.log(`成功加载 ${eventList.length} 条排班记录`);
      return eventList;
      
    } catch (error) {
      console.error('获取排班数据失败:', error);
      ElMessage.error(`获取排班数据失败: ${error.response?.data?.message || error.message}`);
      events.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 刷新数据（清除缓存）
  const refreshSchedules = async () => {
    cache.clear();
    return await fetchSchedules();
  };

  // 添加排班
  const addSchedule = async (scheduleData: any) => {
    try {
      const response = await apiClient.post('/schedules', scheduleData);
      
      // 清除相关月份的缓存
      const date = new Date(scheduleData.start);
      const cacheKey = getCacheKey(date.getFullYear(), date.getMonth() + 1);
      cache.delete(cacheKey);
      
      // 重新获取数据
      await fetchSchedules();
      
      ElMessage.success('排班添加成功');
      return response.data;
    } catch (error) {
      console.error('添加排班失败:', error);
      ElMessage.error(`添加排班失败: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  // 更新排班
  const updateSchedule = async (id: string, scheduleData: any) => {
    try {
      const response = await apiClient.put(`/schedules/${id}`, scheduleData);
      
      // 清除缓存
      cache.clear();
      
      // 重新获取数据
      await fetchSchedules();
      
      ElMessage.success('排班更新成功');
      return response.data;
    } catch (error) {
      console.error('更新排班失败:', error);
      ElMessage.error(`更新排班失败: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  // 删除排班
  const deleteSchedule = async (id: string) => {
    try {
      await apiClient.delete(`/schedules/${id}`);
      
      // 清除缓存
      cache.clear();
      
      // 重新获取数据
      await fetchSchedules();
      
      ElMessage.success('排班删除成功');
    } catch (error) {
      console.error('删除排班失败:', error);
      ElMessage.error(`删除排班失败: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  // 统计信息
  const statistics = computed(() => {
    const total = events.value.length;
    const conflicts = events.value.filter(e => e.extendedProps.status === 'conflict').length;
    const replacements = events.value.filter(e => e.extendedProps.isReplacement).length;
    
    return {
      total,
      conflicts,
      replacements,
      normal: total - conflicts - replacements
    };
  });

  return {
    loading,
    events,
    currentMonth,
    statistics,
    fetchSchedules,
    refreshSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    getEventColor
  };
}