// 仪表盘数据测试脚本
// 在浏览器控制台中运行此脚本来测试仪表盘数据加载

console.log('🧪 开始测试仪表盘数据加载...');

// 测试员工数据API
async function testEmployeeAPI() {
  console.log('📤 测试员工API接口...');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ 未找到认证token，请先登录系统');
      return false;
    }
    
    const response = await fetch('http://localhost:9020/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 响应状态:', response.status, response.statusText);
    
    if (response.ok) {
      const employees = await response.json();
      console.log('✅ 员工数据获取成功!');
      console.log('📋 员工总数:', employees.length);
      
      if (employees.length > 0) {
        console.log('📋 第一个员工数据:', employees[0]);
        
        // 统计员工状态
        const statusStats = {};
        employees.forEach(emp => {
          statusStats[emp.status] = (statusStats[emp.status] || 0) + 1;
        });
        console.log('📊 员工状态统计:', statusStats);
        
        // 统计员工部门
        const deptStats = {};
        employees.forEach(emp => {
          if (emp.department) {
            deptStats[emp.department] = (deptStats[emp.department] || 0) + 1;
          }
        });
        console.log('📊 员工部门统计:', deptStats);
        
        return { success: true, data: employees, statusStats, deptStats };
      } else {\n        console.log('⚠️ 员工数据为空，可能需要运行种子数据');
        return { success: true, data: [], isEmpty: true };
      }
    } else {\n      const errorText = await response.text();
      console.log('❌ 员工数据获取失败');
      console.log('📋 错误状态:', response.status);
      console.log('📋 错误详情:', errorText);
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error) {
    console.log('❌ 网络错误或其他异常:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试仪表盘数据加载
async function testDashboardData() {
  console.log('\\n📊 测试仪表盘数据加载...');
  
  const employeeResult = await testEmployeeAPI();
  
  if (employeeResult.success && employeeResult.data.length > 0) {
    console.log('✅ 仪表盘应该能正常显示以下数据:');
    console.log('  - 员工总数:', employeeResult.data.length);
    console.log('  - 可用人员:', employeeResult.statusStats['ON_DUTY'] || 0);
    console.log('  - 请假人员:', employeeResult.statusStats['LEAVE'] || 0);
    console.log('  - 出差人员:', employeeResult.statusStats['BUSINESS_TRIP'] || 0);
    
    return { success: true, stats: employeeResult };
  } else if (employeeResult.success && employeeResult.isEmpty) {
    console.log('⚠️ 员工数据为空，需要初始化测试数据');
    console.log('💡 解决方案:');
    console.log('  1. 重启后端服务以运行种子数据');
    console.log('  2. 或者手动添加员工数据');
    
    return { success: false, reason: 'empty_data' };
  } else {\n    console.log('❌ 仪表盘数据加载失败');
    console.log('💡 可能的问题:');
    
    if (employeeResult.status === 401) {
      console.log('  - 认证失败，请重新登录');
    } else if (employeeResult.status === 404) {
      console.log('  - API接口不存在，检查后端路由配置');
    } else if (employeeResult.status === 500) {
      console.log('  - 服务器内部错误，检查后端日志');
    } else {\n      console.log('  - 网络连接问题或其他错误');
    }
    
    return { success: false, error: employeeResult };
  }
}

// 检查后端服务状态
async function checkBackendStatus() {
  console.log('\\n🔍 检查后端服务状态...');
  
  try {
    const response = await fetch('http://localhost:9020/api/health', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ 后端服务运行正常');
      return true;
    } else {\n      console.log('⚠️ 后端服务响应异常:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 无法连接到后端服务');
    console.log('💡 请确认:');
    console.log('  - 后端服务是否在 http://localhost:9020 运行');
    console.log('  - 防火墙是否阻止了连接');
    return false;
  }
}

// 运行完整测试
async function runCompleteTest() {
  console.log('🚀 开始完整的仪表盘数据测试...');
  console.log('='.repeat(60));
  
  // 检查后端服务
  const backendOk = await checkBackendStatus();
  if (!backendOk) {
    console.log('❌ 后端服务不可用，测试终止');
    return;
  }
  
  // 测试仪表盘数据
  const dashboardResult = await testDashboardData();
  
  console.log('='.repeat(60));
  console.log('📊 测试结果总结:');
  
  if (dashboardResult.success) {
    console.log('🎉 仪表盘数据测试通过！');
    console.log('💡 仪表盘应该正常显示人员统计数据');
    
    // 提供刷新建议
    console.log('\\n🔄 如果仪表盘仍然显示0，请尝试:');
    console.log('  1. 刷新仪表盘页面');
    console.log('  2. 检查浏览器控制台是否有错误');
    console.log('  3. 确认API调用是否成功');
  } else {\n    console.log('❌ 仪表盘数据测试失败');
    
    if (dashboardResult.reason === 'empty_data') {
      console.log('\\n🛠️ 解决步骤:');
      console.log('  1. 停止后端服务 (Ctrl+C)');
      console.log('  2. 重新启动后端服务 (npm run start:dev)');
      console.log('  3. 等待种子数据初始化完成');
      console.log('  4. 重新测试');
    } else {\n      console.log('\\n🛠️ 排查步骤:');
      console.log('  1. 检查后端日志是否有错误');
      console.log('  2. 确认数据库连接正常');
      console.log('  3. 验证API接口路径正确');
      console.log('  4. 检查认证token是否有效');
    }
  }
  
  return dashboardResult;
}

// 导出测试函数
window.testEmployeeAPI = testEmployeeAPI;
window.testDashboardData = testDashboardData;
window.checkBackendStatus = checkBackendStatus;
window.runCompleteTest = runCompleteTest;

console.log('📝 仪表盘数据测试脚本已加载');
console.log('💡 使用方法:');
console.log('  - runCompleteTest() - 运行完整测试');
console.log('  - testEmployeeAPI() - 仅测试员工API');
console.log('  - checkBackendStatus() - 检查后端状态');
console.log('\\n🎯 现在运行: runCompleteTest()');

// 自动运行测试
setTimeout(() => runCompleteTest(), 1000);