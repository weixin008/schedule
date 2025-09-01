<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import apiClient from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useEmployeeStore } from '@/stores/employee';
import { useAuthStore } from '@/stores/auth';
import { MagicStick, Setting, Download, Upload, Delete } from '@element-plus/icons-vue';
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventInput } from '@fullcalendar/core';
import type { FormInstance } from 'element-plus'
import { ElUpload } from 'element-plus';
import ReplacementDialog from '@/components/ReplacementDialog.vue'; // 导入替班对话框组件
import DayDetailDialog from '@/components/DayDetailDialog.vue'; // 导入日期详情对话框

const API_URL = '/schedules';

const calendarRef = ref();
const uploadRef = ref();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();
const dialogVisible = ref(false);
const replacementDialogVisible = ref(false);
const conflictData = ref(null);
const conflictMessage = ref('');
const replacementEmployees = ref([]);
const conflictScheduleId = ref<number | null>(null);
const dayDetailDialogVisible = ref(false);
const selectedDate = ref('');
const currentView = ref('dayGridMonth');
import { useGroupStore } from '@/stores/group'; // 添加导入

// ...其他代码...

const loading = ref(false);
const events = ref<EventInput[]>([]); // 添加类型注解
const groupStore = useGroupStore(); // 新增全局编组状态

// 开发模式检测
const isDevelopmentMode = ref(import.meta.env.DEV);
const form = ref({
  employeeId: null,
  start: '',
  end: '',
  title: '',
  shift: 'morning',
  positionId: 1,
  notes: '',
  date: new Date(),
  startTime: '09:00',
  endTime: '17:00'
});
const formRef = ref<FormInstance | null>(null);

// 视图切换方法
function changeView(view: string) {
  const calendarApi = calendarRef.value?.getApi();
  if (calendarApi) {
    calendarApi.changeView(view);
  }
}

function resetForm() {
  form.value = {
    employeeId: null,
    start: '',
    end: '',
    title: '',
    shift: 'morning',
    positionId: 1,
    notes: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '17:00'
  };
}

function handleDateSelect(arg: DateSelectArg) {
  // 移除新增排班功能，日期选择不做任何操作
  // 或者可以显示该日期的排班详情
  selectedDate.value = arg.startStr;
  dayDetailDialogVisible.value = true;
};

const handleFormSubmit = async () => {
  try {
    if (!form.value.employeeId) {
      ElMessage.error('请选择员工');
      return;
    }
    
    const payload = {
      title: form.value.title || `班次 - ${employeeStore.getEmployeeName(form.value.employeeId)}`,
      employeeId: form.value.employeeId,
      start: form.value.start,
      end: form.value.end,
      shift: form.value.shift,
      positionId: form.value.positionId,
      notes: form.value.notes,
      date: form.value.date,
      startTime: form.value.startTime,
      endTime: form.value.endTime
    };
    const response = await apiClient.post('/schedules', payload);
    const calendarApi = calendarRef.value.getApi();
    calendarApi.addEvent({
        id: response.data.id,
        title: response.data.title,
        start: response.data.start,
        end: response.data.end,
        extendedProps: {
            employeeId: response.data.employee.id
        }
    });
    dialogVisible.value = false;
    ElMessage.success('排班创建成功');
  } catch (error: any) {
    // 处理冲突错误，显示替班对话框
    if (error.response?.status === 400 && error.response?.data?.conflictType) {
      conflictData.value = error.response.data;
      conflictMessage.value = error.response.data.message || '检测到排班冲突';
      replacementEmployees.value = error.response.data.availableReplacements || [];
      replacementDialogVisible.value = true;
    } else {
      const message = error.response?.data?.message || '创建失败，这是一个无效的排班';
      if (Array.isArray(message)) {
        ElMessage.error(message.join(', '));
      } else {
        ElMessage.error(message);
      }
    }
  }
};

function handleEventClick(clickInfo: EventClickArg) {
  const event = clickInfo.event;
  const employee = event.extendedProps.employee;
  const roleName = event.extendedProps.roleName || '值班';
  
  // 显示替班对话框
  ElMessageBox.confirm(
    `当前 ${roleName} 安排：${employee?.name || '未知员工'}\n\n是否需要安排替班？`,
    '值班安排',
    {
      confirmButtonText: '安排替班',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 设置替班相关数据
    conflictScheduleId.value = event.id; // 保留原始ID类型
    conflictMessage.value = `为 ${roleName} 安排替班人员`;
    
    // 获取可替班人员列表
    loadReplacementEmployees(parseInt(event.id));
    
    replacementDialogVisible.value = true;
  }).catch(() => {
    // 用户取消
  });
}

async function handleEventDrop(arg: EventDropArg) {
  const event = arg.event;
  const scheduleId = event.id;
  const updateDto = {
    start: event.start,
    end: event.end,
  };
  try {
    await apiClient.patch(`${API_URL}/${scheduleId}`, updateDto);
    ElMessage.success('排班更新成功');
  } catch (error: any) {
    // 处理冲突错误
    if (error.response?.status === 400 && error.response?.data?.conflictType) {
      conflictData.value = error.response.data;
      conflictMessage.value = error.response.data.message || '检测到排班冲突';
      replacementEmployees.value = error.response.data.availableReplacements || [];
      conflictScheduleId.value = scheduleId; // 保留原始ID类型
      replacementDialogVisible.value = true;
    } else {
      arg.revert();
      const message = error.response?.data?.message || '更新失败，这是一个无效的排班';
      if (Array.isArray(message)) {
        ElMessage.error(message.join(', '));
      } else {
        ElMessage.error(message);
      }
    }
  }
};

// 处理替班请求
const handleReplacementConfirm = async (replacementData: {replacementEmployeeId: number, reason: string}) => {
  try {
    if (conflictData.value && conflictData.value.conflictType === 'DOUBLE_SHIFT') {
      // 创建新排班时的替班处理
      const newScheduleData = {
        ...form.value,
        employeeId: replacementData.replacementEmployeeId,
        replacementEmployeeId: replacementData.replacementEmployeeId,
        replacementReason: replacementData.reason
      };
      
      const response = await apiClient.post(API_URL, newScheduleData);
      ElMessage.success('替班排班创建成功');
      await fetchSchedules();
    } else if (conflictScheduleId.value) {
      // 更新排班时的替班处理
      const response = await apiClient.post('/schedules/replace', {
        scheduleId: conflictScheduleId.value,
        replacementEmployeeId: replacementData.replacementEmployeeId,
        reason: replacementData.reason
      });
      
      ElMessage.success('替班成功');
      await fetchSchedules();
    }
    
    replacementDialogVisible.value = false;
    dialogVisible.value = false;
    conflictData.value = null;
    conflictScheduleId.value = null;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '替班失败');
  }
};

// 取消替班
const handleReplacementCancel = () => {
  replacementDialogVisible.value = false;
  conflictData.value = null;
};

// 加载可替班人员
const loadReplacementEmployees = async (scheduleId: number) => {
  try {
    // 确保员工数据已加载
    if (employeeStore.employees.length === 0) {
      await employeeStore.fetchEmployees();
    }
    
    // 直接从员工store获取数据
    replacementEmployees.value = employeeStore.employees.filter((emp: any) =>
      emp.status === 'ON_DUTY'
    ) as any; // 临时类型处理
  } catch (error) {
    ElMessage.error('获取可替班人员失败');
    replacementEmployees.value = [];
  }
};

// Excel导出功能
const exportSchedules = async () => {
  try {
    const response = await apiClient.get('/schedules/export', {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `排班表_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

// Excel导入成功处理
const handleImportSuccess = (response: any) => {
  ElMessage.success(`导入完成，成功: ${response.filter((r: any) => r.success).length}，失败: ${response.filter((r: any) => !r.success).length}`);
  fetchSchedules(); // 重新加载数据
};

// Excel导入失败处理
const handleImportError = () => {
  ElMessage.error('导入失败，请检查文件格式');
};

// 处理日期点击事件
function handleDateClick(clickInfo: DateClickArg) {
  selectedDate.value = clickInfo.dateStr;
  dayDetailDialogVisible.value = true;
}

// 清空所有排班（开发模式）
const clearAllSchedules = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有排班数据吗？此操作不可恢复！',
      '清空排班确认',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    // 首先清除localStorage中的数据
    const generatedSchedules = localStorage.getItem('generatedSchedules');
    if (generatedSchedules) {
      localStorage.removeItem('generatedSchedules');
    }
    
    try {
      // 使用批量删除API
      const deleteResponse = await apiClient.delete('/schedules');
      const result = deleteResponse.data;
      ElMessage.success(`✅ 清空完成（本地: ${generatedSchedules ? 'Y' : 'N'}, API: ${result.message || 'Y'}）`);
      
    } catch (apiError: any) {
      // API失败但localStorage已清除，仍然算部分成功
      ElMessage.success(`✅ 本地排班数据已清除${generatedSchedules ? '' : '（无本地数据）'}`);
    }
    
    // 清空日历显示
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi();
      calendarApi.removeAllEvents();
    }
    
    events.value = [];
    
  } catch (error: any) {
    if (error === 'cancel') {
    } else {
      const errorMessage = error.response?.data?.message || error.message || '未知错误';
      ElMessage.error(`清空排班失败: ${errorMessage}`);
    }
  }
};

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  locale: zhCnLocale,
  firstDay: 1,
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: '' // 移除右侧工具栏，使用自定义按钮
  },
  events: [],
  editable: false,
  selectable: false,
  selectMirror: false,
  dayMaxEvents: true,
  weekends: true,
  height: 'auto',
  aspectRatio: 1.8,
  eventDisplay: 'block',
  displayEventTime: true,
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  // 事件样式
  eventClassNames: function(arg: any) {
    const classes = ['schedule-event'];
    if (arg.event.extendedProps.status === 'conflict') {
      classes.push('conflict-event');
    }
    if (arg.event.extendedProps.isReplacement) {
      classes.push('replacement-event');
    }
    
    // 添加角色类型样式
    const roleName = arg.event.extendedProps.roleName || '';
    if (roleName.includes('领导') || roleName.includes('带班')) {
      classes.push('leader-role');
    } else if (roleName.includes('监督') || roleName.includes('考勤')) {
      classes.push('supervisor-role');
    } else if (arg.event.extendedProps.assignmentType === 'GROUP') {
      classes.push('group-role');
    } else {
      classes.push('duty-role');
    }
    
    return classes;
  },
  // 事件内容自定义 - 简化版本
  eventContent: function(arg: any) {
    const event = arg.event;
    const schedule = event.extendedProps; // 获取排班数据
    const employee = schedule.employee;
    const roleName = schedule.roleName || '值班';
    const department = schedule.department || '';
    
    const displayName = employee?.name || '未知员工';
    const displayDept = department && department !== '未知部门' ? department : '';
    
    // 如果是编组值班，显示成员数量
    let groupMembersHtml = '';
    if (schedule.assignedGroupId) {
      const group = groupMap.value.get(schedule.assignedGroupId);
      if (group && group.memberIds && group.memberIds.length > 0) {
        groupMembersHtml = `<div class="group-members">${group.memberIds.length}人</div>`;
      }
    }
    
    return {
      html: `
        <div class="custom-event">
          <div class="role-name">${roleName}</div>
          <div class="employee-name">${displayName}</div>
          ${displayDept ? `<div class="dept-name">${displayDept}</div>` : ''}
          ${groupMembersHtml}
        </div>
      `
    };
  },
  eventClick: handleEventClick,
  eventDrop: handleEventDrop,
  dateClick: handleDateClick,
  loading: function(isLoading: boolean) { // 添加类型注解
    loading.value = isLoading;
  }
});

// 加载编组数据
interface Group {
  id: number;
  name: string;
  memberIds?: number[];
}

const groups = ref<Group[]>([]);
const groupMap = computed(() => {
  const map = new Map<number, Group>();
  groups.value.forEach(group => {
    map.set(group.id, group);
  });
  return map;
});

// 加载编组列表
const loadGroups = async () => {
  try {
    // 优先尝试从API加载最新数据
    try {
      const response = await apiClient.get('/groups')  // 修正API路径
      if (response.data && response.data.length > 0) {
        groups.value = response.data;
        return;
      }
    } catch (apiError) {
    }
    
    // API失败或无数据时，从localStorage加载
    const localGroups = localStorage.getItem('groups');
    if (localGroups) {
      const parsedGroups = JSON.parse(localGroups);
      if (parsedGroups.length > 0) {
        groups.value = parsedGroups;
        return;
      }
    }
    
    groups.value = [];
  } catch (error) {
    console.error('加载编组列表失败:', error)
    groups.value = [];
  }
};

async function fetchSchedules() {
  loading.value = true;
  
  // 确保编组数据已加载
  if (groups.value.length === 0) {
    await loadGroups();
  }
  
  try {
    let schedules: any[] = [];
    
    // 首先尝试从localStorage加载生成的排班数据
    const generatedSchedules = localStorage.getItem('generatedSchedules');
    if (generatedSchedules) {
      const localSchedules = JSON.parse(generatedSchedules);
      schedules = [...schedules, ...localSchedules];
    }
    
    // 然后尝试从API加载
    try {
      const response = await apiClient.get('/schedules');
      const apiSchedules = response.data || [];
      schedules = [...schedules, ...apiSchedules];
    } catch (apiError: any) {
    }
    if (schedules.length > 0) {
    }
    
    const calendarEvents: any[] = schedules
      .filter((schedule: any) => {
        // 对于localStorage数据，检查是否有assignedPersonId或员工信息
        if (schedule.assignedPersonId) {
          return true; // localStorage数据有assignedPersonId
        }
        
        // 对于API数据，检查员工信息或编组信息
        const employee = schedule.employee || schedule.assignedPerson || null;
        const group = schedule.assignedGroup || null;
        
        // 确保有有效的分配（人员或编组）
        return (employee && employee.name) || (group && group.name) || schedule.assignedGroupId;
      })
      .map((schedule: any) => {
        // 处理员工信息
        let employeeName = '';
        
        if (schedule.assignedPersonId) {
          // 这是localStorage数据，需要根据ID查找员工姓名
          const employee = employeeStore.employees.find(emp => emp.id === schedule.assignedPersonId);
          employeeName = employee ? employee.name : `员工${schedule.assignedPersonId}`;
          if (employee) {
          }
        } else if (schedule.assignedGroupId) {
          // 编组分配 - 从编组映射中获取名称
          const group = groupMap.value.get(schedule.assignedGroupId) || null;
          if (group) {
            employeeName = group.name;
          } else {
            employeeName = `编组${schedule.assignedGroupId}`;
          }
        } else {
          // 这是API数据
          const employee = schedule.employee || schedule.assignedPerson || null;
          employeeName = employee?.name || schedule.employeeName || '未知员工';
        }
      // 处理时间信息
      let startTime, endTime;
      if (schedule.start && schedule.end) {
        // 使用现有的start/end字段
        startTime = schedule.start;
        endTime = schedule.end;
      } else if (schedule.date && schedule.startTime && schedule.endTime) {
        // 从date和时间字段构建
        const dateStr = schedule.date.split('T')[0]; // 获取日期部分
        startTime = `${dateStr}T${schedule.startTime}`;
        endTime = `${dateStr}T${schedule.endTime}`;
      } else {
        // 默认时间
        const dateStr = schedule.date ? schedule.date.split('T')[0] : new Date().toISOString().split('T')[0];
        startTime = `${dateStr}T08:00:00`;
        endTime = `${dateStr}T18:00:00`;
      }
      
      // 验证时间格式
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        // 使用默认时间
        const dateStr = schedule.date ? schedule.date.split('T')[0] : new Date().toISOString().split('T')[0];
        startTime = `${dateStr}T08:00:00`;
        endTime = `${dateStr}T18:00:00`;
      }
      
      // 获取角色信息 - 优先从title中提取，然后使用roleName
      let roleName = schedule.roleName || schedule.shift || '值班';
      
      // 如果title包含角色信息，从title中提取
      if (schedule.title) {
        const titleParts = schedule.title.split(' - ');
        if (titleParts.length > 1) {
          roleName = titleParts[0]; // 取title的第一部分作为角色名
        }
      }
      
      // 创建更清晰的标题格式
      const cleanTitle = `${roleName}\n${employeeName}`;
      
      const eventData = {
        id: schedule.id || `local_${Date.now()}_${Math.random()}`,
        title: cleanTitle,
        start: startTime,
        end: endTime,
        backgroundColor: getEventColor(schedule),
        borderColor: getEventColor(schedule),
        extendedProps: {
          employeeId: schedule.employeeId || schedule.assignedPersonId,
          employee: schedule.assignedPersonId ? {
            id: schedule.assignedPersonId,
            name: employeeName,
            departmentInfo: employeeStore.employees.find(emp => emp.id === schedule.assignedPersonId)?.departmentInfo,
            department: employeeStore.employees.find(emp => emp.id === schedule.assignedPersonId)?.departmentInfo?.name || 
                       employeeStore.employees.find(emp => emp.id === schedule.assignedPersonId)?.department || 
                       '未知部门'
          } : schedule.assignedGroupId ? {
            id: schedule.assignedGroupId,
            name: employeeName,
            type: 'GROUP',
            department: '编组值班'
          } : (schedule.employee || schedule.assignedPerson),
          shift: schedule.shift,
          roleName: roleName,
          roleId: schedule.roleId,
          notes: schedule.notes,
          status: schedule.status || 'NORMAL',
          isReplacement: schedule.isReplacement || false,
          department: schedule.assignedPersonId ?
            (employeeStore.employees.find(emp => emp.id === schedule.assignedPersonId)?.departmentInfo?.name || 
             employeeStore.employees.find(emp => emp.id === schedule.assignedPersonId)?.department || 
             '未知部门') :
            (schedule.employee?.departmentInfo?.name || 
             schedule.employee?.department || 
             schedule.assignedPerson?.departmentInfo?.name || 
             schedule.assignedPerson?.department || 
             '未知部门')
        }
      };
      return eventData;
    });
    // 暂时保留测试事件用于对比
    // 移除测试事件，避免类型冲突
    // const testEvent = {
    //   id: 'test-event',
    //   title: '测试事件',
    //   start: new Date().toISOString().split('T')[0] + 'T09:00:00',
    //   end: new Date().toISOString().split('T')[0] + 'T17:00:00',
    //   backgroundColor: '#409eff',
    //   borderColor: '#409eff'
    // };
    // calendarEvents.push(testEvent);
    //
    // 更新事件数据
    events.value = calendarEvents;
    
    // 更新日历显示
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi();
      
      // 清除所有现有事件
      calendarApi.removeAllEvents();
      
      // 添加新事件
      calendarEvents.forEach((event, index) => {
        try {
          const addedEvent = calendarApi.addEvent(event);
        } catch (error) {

        }
      });
      
      // 检查日历中实际的事件数量
      const actualEvents = calendarApi.getEvents();
      actualEvents.forEach((event: any, index: number) => { // 添加类型注解
      });
      
      // 强制重新渲染
      calendarApi.render();
    } else {
      calendarOptions.value.events = calendarEvents;
    }
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || '未知错误';
    ElMessage.error(`获取排班数据失败: ${message}`);
    events.value = [];
  } finally {
    loading.value = false;
  }
}

// 根据角色类型获取事件颜色
function getEventColor(schedule: any) {
  // 优先处理状态颜色
  if (schedule.status === 'conflict') {
    return '#f56c6c'; // 红色表示冲突
  }
  if (schedule.isReplacement) {
    return '#e6a23c'; // 橙色表示替班
  }
  
  // 根据角色名称分配颜色
  const roleName = schedule.roleName || schedule.shift || '';
  
  if (roleName.includes('领导') || roleName.includes('带班')) {
    return '#409eff'; // 蓝色 - 带班领导
  } else if (roleName.includes('监督') || roleName.includes('考勤')) {
    return '#e6a23c'; // 橙色 - 考勤监督员
  } else if (schedule.assignmentType === 'GROUP') {
    return '#909399'; // 灰色 - 编组值班
  } else if (roleName.includes('值班员')) {
    return '#67c23a'; // 绿色 - 值班员
  }
  
  // 根据角色ID分配不同颜色（备用方案）
  const roleId = schedule.roleId;
  const roleColors = [
    '#409eff', // 蓝色
    '#67c23a', // 绿色
    '#e6a23c', // 橙色
    '#f56c6c', // 红色
    '#909399', // 灰色
    '#722ed1', // 紫色
    '#13c2c2', // 青色
    '#fa8c16', // 金色
    '#eb2f96', // 洋红
    '#52c41a'  // 亮绿
  ];
  
  if (roleId && typeof roleId === 'number') {
    return roleColors[roleId % roleColors.length];
  }
  
  return '#409eff'; // 默认蓝色
}

// 备选删除方案：逐个删除
const fallbackDeleteAll = async () => {
  try {
    // 获取所有排班记录
    const response = await apiClient.get('/schedules');
    const schedules = response.data || [];
    if (schedules.length === 0) {
      ElMessage.info('没有排班记录需要清空');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const schedule of schedules) {
      try {
        await apiClient.delete(`/schedules/${schedule.id}`);
        successCount++;
      } catch (deleteError: any) {
        failCount++;
      }
    }
    
    // 清空日历显示
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi();
      calendarApi.removeAllEvents();
    }
    
    events.value = [];
    
    if (failCount === 0) {
      ElMessage.success(`✅ 已成功清空 ${successCount} 条排班记录`);
    } else {
      ElMessage.warning(`⚠️ 清空完成：成功 ${successCount} 条，失败 ${failCount} 条`);
    }
    
    // 重新加载数据确保同步
    await fetchSchedules();
    
  } catch (error: any) {
    ElMessage.error('清空排班失败，请检查网络连接或联系管理员');
  }
};

onMounted(async () => {
  try {
    // 并行加载员工和编组数据
    await Promise.all([
      employeeStore.fetchEmployees(),
      groupStore.fetchGroups()
    ]);

    // 检查员工数据结构
    if (employeeStore.employees.length > 0) {
    }
  } catch (error) {
  }
  
  // 如果员工数据为空或加载失败，使用测试数据
  if (employeeStore.employees.length === 0) {
    // 这里使用与员工store中相同的测试数据
    const testEmployees = [
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
    
    // 直接设置到store中
    employeeStore.employees = testEmployees;
  }
  
  await fetchSchedules();
});
</script>

<template>
  <div class="page-container">
    <el-card class="content-card">
       <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="header-title">排班日历</span>
            <span class="header-subtitle">查看和管理排班安排</span>
          </div>
          <div class="header-actions">
            <!-- 视图切换 -->
            <el-radio-group v-model="currentView" size="small" @change="changeView">
              <el-radio-button label="dayGridMonth">月视图</el-radio-button>
              <el-radio-button label="timeGridWeek">周视图</el-radio-button>
              <el-radio-button label="timeGridDay">日视图</el-radio-button>
            </el-radio-group>
            
            <!-- 操作按钮 -->
            <el-button-group>
              <el-button type="warning" :icon="MagicStick" @click="$router.push('/schedule/engine')">
                智能排班
              </el-button>
              <el-button type="info" :icon="Setting" @click="$router.push('/schedule/roles')">
                值班角色
              </el-button>
            </el-button-group>
            
            <!-- 导入导出 -->
            <el-button-group>
              <el-button type="success" :icon="Download" @click="exportSchedules">
                导出Excel
              </el-button>
              <el-upload
                ref="uploadRef"
                action="/api/schedules/import"
                :headers="{ Authorization: `Bearer ${authStore.token}` }"
                :show-file-list="false"
                :on-success="handleImportSuccess"
                :on-error="handleImportError"
                accept=".xlsx,.xls"
              >
                <el-button type="primary" :icon="Upload">导入Excel</el-button>
              </el-upload>
            </el-button-group>
            
            <!-- 开发模式按钮 -->
            <el-button-group v-if="isDevelopmentMode">
              <el-button type="danger" :icon="Delete" @click="clearAllSchedules">
                清空排班
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>
      
      <!-- 日历组件 -->
      <FullCalendar 
        v-else
        :options="calendarOptions as any"
        ref="calendarRef" 
        class="custom-calendar"
      />
    </el-card>
    
    <!-- 移除新增排班对话框，只保留替班功能 -->

    <!-- 替班对话框 -->
    <ReplacementDialog
      :visible="replacementDialogVisible"
      :conflictMessage="conflictMessage"
      :replacementEmployees="replacementEmployees"
      @cancel="replacementDialogVisible = false"
      @confirm="handleReplacementConfirm"
    />

    <!-- 日期详情对话框 -->
    <DayDetailDialog 
      v-model:visible="dayDetailDialogVisible"
      :selected-date="selectedDate"
      @schedule-updated="fetchSchedules"
    />
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.content-card {
  border-radius: 8px;
}

.loading-container {
  padding: 20px;
  min-height: 400px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  
  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: #1d2129;
  }
  
  .header-subtitle {
    font-size: 14px;
    color: #606266;
    margin-top: 4px;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Making FullCalendar responsive */
.fc {
  max-width: 100%;
  margin: 0 auto;
}

/* 自定义事件样式 */
:deep(.schedule-event) {
  border-radius: 4px;
  border: none;
  font-size: 12px;
  padding: 2px 6px;
  
  .custom-event {
    .role-name {
      font-weight: 700;
      font-size: 11px;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      line-height: 1.2;
    }
    
    .employee-name {
      font-weight: 600;
      font-size: 12px;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      line-height: 1.2;
      margin-top: 1px;
    }
    
    .dept-name {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      line-height: 1.2;
      margin-top: 1px;
    }
  }
  
  .event-content {
    .event-role {
      font-weight: 600;
      color: #fff;
      line-height: 1.2;
      font-size: 11px;
    }
    
    /* 改进的事件样式 */
    &.improved-event {
      padding: 3px 6px;
      
      .event-main {
        display: flex;
        flex-direction: column;
        gap: 1px;
        
        .event-role {
          font-weight: 700;
          font-size: 11px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          color: #fff;
        }
        
        .event-employee {
          font-weight: 600;
          font-size: 12px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          color: #fff;
        }
      }
      
      .event-dept {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.9);
        margin-top: 2px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    }
    
    .event-employee {
      font-weight: 500;
      color: #fff;
      line-height: 1.2;
      margin-top: 1px;
    }
    
    .event-details {
      display: flex;
      gap: 4px;
      margin-top: 2px;
      font-size: 10px;
      opacity: 0.9;
      
      .event-shift {
        background: rgba(255, 255, 255, 0.2);
        padding: 1px 4px;
        border-radius: 2px;
      }
      
      .event-dept {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

:deep(.conflict-event) {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  
  &:hover {
    background-color: #f78989 !important;
  }
}

:deep(.replacement-event) {
  background-color: #e6a23c !important;
  border-color: #e6a23c !important;
  
  &:hover {
    background-color: #ebb563 !important;
  }
}

/* 不同角色类型的颜色标识 */
:deep(.schedule-event.leader-role) {
  background-color: #409eff !important; /* 蓝色 - 带班领导 */
  border-color: #409eff !important;
}

:deep(.schedule-event.duty-role) {
  background-color: #67c23a !important; /* 绿色 - 值班员 */
  border-color: #67c23a !important;
}

:deep(.schedule-event.supervisor-role) {
  background-color: #e6a23c !important; /* 橙色 - 考勤监督员 */
  border-color: #e6a23c !important;
}

:deep(.schedule-event.group-role) {
  background-color: #909399 !important; /* 灰色 - 编组值班 */
  border-color: #909399 !important;
}

/* 编组事件样式 */
:deep(.group-event) {
  .group-name {
    font-weight: 700;
    font-size: 11px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  
  .members-count {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 2px;
  }
  
  .hover-details {
    display: none;
    position: absolute;
    background: rgba(0,0,0,0.8);
    padding: 8px;
    border-radius: 4px;
    z-index: 100;
    width: max-content;
    max-width: 200px;
    font-size: 12px;
    color: #fff;
  }
  
  &:hover .hover-details {
    display: block;
  }
}

/* 日历头部样式优化 */
:deep(.fc-toolbar) {
  margin-bottom: 1.5em;
  
  .fc-toolbar-title {
    font-size: 1.5em;
    font-weight: 600;
    color: #1d2129;
  }
  
  .fc-button-group {
    .fc-button {
      background-color: #409eff;
      border-color: #409eff;
      
      &:hover {
        background-color: #66b1ff;
        border-color: #66b1ff;
      }
      
      &.fc-button-active {
        background-color: #337ecc;
        border-color: #337ecc;
      }
    }
  }
}

/* 今天高亮 */
:deep(.fc-day-today) {
  background-color: rgba(64, 158, 255, 0.1) !important;
}

/* 周末样式 */
:deep(.fc-day-sat),
:deep(.fc-day-sun) {
  background-color: rgba(0, 0, 0, 0.02);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    
    .el-radio-group {
      justify-content: center;
    }
    
    .el-button-group {
      display: flex;
      justify-content: center;
    }
  }
  
  :deep(.fc-toolbar) {
    flex-direction: column;
    gap: 10px;
    
    .fc-toolbar-chunk {
      display: flex;
      justify-content: center;
    }
  }
  
  :deep(.schedule-event) {
    font-size: 10px;
    
    .event-details {
      display: none; /* 在小屏幕上隐藏详细信息 */
    }
  }
}
</style>