// 值班角色配置API测试脚本
// 在浏览器控制台中运行此脚本来测试API

const API_BASE = 'http://localhost:3000/api';

// 测试数据
const testRoleData = {
  name: '测试值班角色',
  description: '这是一个测试用的值班角色配置',
  type: 'day',
  priority: 5,
  shifts: [
    {
      name: '早班',
      code: 'A',
      startTime: '08:00',
      endTime: '16:00',
      duration: 8,
      color: '#409EFF'
    },
    {
      name: '晚班',
      code: 'B',
      startTime: '16:00',
      endTime: '00:00',
      duration: 8,
      color: '#67C23A'
    }
  ],
  groups: [
    {
      name: 'A组',
      memberIds: [1, 2, 3],
      minMembers: 1,
      maxMembers: 3
    },
    {
      name: 'B组',
      memberIds: [4, 5, 6],
      minMembers: 1,
      maxMembers: 3
    }
  ],
  rules: {
    cycle: 'weekly',
    rotationType: 'sequential',
    maxConsecutiveDays: 3,
    minRestHours: 12,
    workDays: ['1', '2', '3', '4', '5'],
    holidayHandling: 'normal',
    specialRequirements: '测试特殊要求'
  }
};

// API测试函数
async function testShiftRoleAPI() {
  console.log('🚀 开始测试值班角色配置API...');
  
  try {
    // 1. 测试获取员工列表
    console.log('📋 测试获取员工列表...');
    const employeesResponse = await fetch(`${API_BASE}/employees`);
    const employees = await employeesResponse.json();
    console.log('✅ 员工列表获取成功:', employees.length, '个员工');
    
    // 2. 测试创建值班角色
    console.log('➕ 测试创建值班角色...');
    const createResponse = await fetch(`${API_BASE}/shift-roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRoleData)
    });
    
    if (createResponse.ok) {
      const createdRole = await createResponse.json();
      console.log('✅ 值班角色创建成功:', createdRole);
      
      // 3. 测试获取值班角色列表
      console.log('📋 测试获取值班角色列表...');
      const rolesResponse = await fetch(`${API_BASE}/shift-roles`);
      const roles = await rolesResponse.json();
      console.log('✅ 值班角色列表获取成功:', roles.length, '个角色');
      
      // 4. 测试排班预览
      console.log('👁️ 测试排班预览...');
      const previewResponse = await fetch(`${API_BASE}/simplified-schedule-engine/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleConfig: testRoleData,
          startDate: new Date().toISOString(),
          days: 7
        })
      });
      
      if (previewResponse.ok) {
        const preview = await previewResponse.json();
        console.log('✅ 排班预览生成成功:', preview);
      } else {
        console.log('⚠️ 排班预览生成失败:', previewResponse.status);
      }
      
      // 5. 测试删除值班角色（清理测试数据）
      console.log('🗑️ 清理测试数据...');
      const deleteResponse = await fetch(`${API_BASE}/shift-roles/${createdRole.id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('✅ 测试数据清理成功');
      } else {
        console.log('⚠️ 测试数据清理失败');
      }
      
    } else {
      console.log('❌ 值班角色创建失败:', createResponse.status);
      const error = await createResponse.text();
      console.log('错误详情:', error);
    }
    
    console.log('🎉 API测试完成！');
    
  } catch (error) {
    console.error('❌ API测试过程中发生错误:', error);
  }
}

// 测试连接性
async function testConnection() {
  console.log('🔗 测试API连接...');
  
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      console.log('✅ API连接正常');
      return true;
    } else {
      console.log('⚠️ API连接异常:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ API连接失败:', error.message);
    return false;
  }
}

// 运行测试
async function runTests() {
  const isConnected = await testConnection();
  if (isConnected) {
    await testShiftRoleAPI();
  } else {
    console.log('❌ 无法连接到API服务器，请确保后端服务正在运行');
  }
}

// 导出测试函数供手动调用
window.testShiftRoleAPI = testShiftRoleAPI;
window.testConnection = testConnection;
window.runTests = runTests;

console.log('📝 值班角色配置API测试脚本已加载');
console.log('💡 使用方法:');
console.log('  - runTests() - 运行完整测试');
console.log('  - testConnection() - 仅测试连接');
console.log('  - testShiftRoleAPI() - 仅测试API功能');