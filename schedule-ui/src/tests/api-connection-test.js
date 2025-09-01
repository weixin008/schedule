// API连接测试脚本
// 在浏览器控制台中运行此脚本来测试API连接

const API_BASE = 'http://localhost:9020/api';

// 测试API连接
async function testAPIConnection() {
  console.log('🔗 开始测试API连接...');
  
  try {
    // 1. 测试基础连接
    console.log('📡 测试基础连接...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (healthResponse.ok) {
      console.log('✅ 基础连接正常');
    } else {
      console.log('⚠️ 基础连接异常:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ 基础连接失败:', error.message);
  }

  try {
    // 2. 测试员工API
    console.log('👥 测试员工API...');
    const employeesResponse = await fetch(`${API_BASE}/employees`);
    
    if (employeesResponse.ok) {
      const employees = await employeesResponse.json();
      console.log('✅ 员工API正常，获取到', employees.length, '个员工');
      
      // 显示前3个员工的信息
      if (employees.length > 0) {
        console.log('📋 员工数据示例:');
        employees.slice(0, 3).forEach((emp, index) => {
          console.log(`  ${index + 1}. ${emp.name} - ${emp.organizationPosition || emp.position || '未分配岗位'} (ID: ${emp.id})`);
        });
      }
      
      return employees;
    } else {
      console.log('❌ 员工API失败:', employeesResponse.status);
      const errorText = await employeesResponse.text();
      console.log('错误详情:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ 员工API连接失败:', error.message);
    return null;
  }
}

// 测试值班角色API
async function testShiftRoleAPI() {
  console.log('🎭 测试值班角色API...');
  
  try {
    const response = await fetch(`${API_BASE}/shift-roles`);
    
    if (response.ok) {
      const roles = await response.json();
      console.log('✅ 值班角色API正常，获取到', roles.length, '个角色');
      return roles;
    } else {
      console.log('❌ 值班角色API失败:', response.status);
      const errorText = await response.text();
      console.log('错误详情:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ 值班角色API连接失败:', error.message);
    return null;
  }
}

// 测试简化排班引擎API
async function testScheduleEngineAPI() {
  console.log('⚙️ 测试简化排班引擎API...');
  
  try {
    // 测试预览接口（使用简单的测试数据）
    const testData = {
      roleConfig: {
        name: '测试角色',
        type: 'day',
        shifts: [{
          name: '早班',
          code: 'A',
          startTime: '08:00',
          endTime: '16:00'
        }],
        groups: [{
          name: 'A组',
          memberIds: [1, 2],
          minMembers: 1,
          maxMembers: 2
        }],
        rules: {
          cycle: 'weekly',
          rotationType: 'sequential'
        }
      },
      startDate: new Date().toISOString(),
      days: 7
    };
    
    const response = await fetch(`${API_BASE}/simplified-schedule-engine/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const preview = await response.json();
      console.log('✅ 简化排班引擎API正常');
      return preview;
    } else {
      console.log('❌ 简化排班引擎API失败:', response.status);
      const errorText = await response.text();
      console.log('错误详情:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ 简化排班引擎API连接失败:', error.message);
    return null;
  }
}

// 运行完整测试
async function runFullTest() {
  console.log('🚀 开始完整API测试...');
  console.log('='.repeat(50));
  
  const employees = await testAPIConnection();
  const roles = await testShiftRoleAPI();
  const engine = await testScheduleEngineAPI();
  
  console.log('='.repeat(50));
  console.log('📊 测试结果总结:');
  console.log('- 员工API:', employees ? '✅ 正常' : '❌ 异常');
  console.log('- 值班角色API:', roles ? '✅ 正常' : '❌ 异常');
  console.log('- 排班引擎API:', engine ? '✅ 正常' : '❌ 异常');
  
  if (employees && roles && engine) {
    console.log('🎉 所有API测试通过！值班角色配置页面应该可以正常工作了。');
  } else {
    console.log('⚠️ 部分API测试失败，请检查后端服务状态。');
  }
  
  return {
    employees: !!employees,
    roles: !!roles,
    engine: !!engine
  };
}

// 导出测试函数
window.testAPIConnection = testAPIConnection;
window.testShiftRoleAPI = testShiftRoleAPI;
window.testScheduleEngineAPI = testScheduleEngineAPI;
window.runFullTest = runFullTest;

console.log('📝 API连接测试脚本已加载');
console.log('💡 使用方法:');
console.log('  - runFullTest() - 运行完整测试');
console.log('  - testAPIConnection() - 仅测试员工API');
console.log('  - testShiftRoleAPI() - 仅测试值班角色API');
console.log('  - testScheduleEngineAPI() - 仅测试排班引擎API');