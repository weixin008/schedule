// 快速API测试脚本
// 在浏览器控制台中运行此脚本来快速验证API是否正常

const API_BASE = 'http://localhost:9020/api';

async function quickTest() {
  console.log('🚀 快速API测试开始...');
  
  // 测试员工API
  try {
    console.log('📋 测试员工API: GET /api/employees');
    const response = await fetch(`${API_BASE}/employees`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 员工API正常 - 获取到', data.length, '个员工');
      
      // 显示前3个员工
      if (data.length > 0) {
        console.log('👥 员工数据示例:');
        data.slice(0, 3).forEach((emp, i) => {
          console.log(`  ${i+1}. ${emp.name} - ${emp.organizationPosition || emp.position || '未分配'} (ID: ${emp.id})`);
        });
      }
      
      return true;
    } else {
      console.log('❌ 员工API失败:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ 员工API连接失败:', error.message);
    return false;
  }
}

// 测试值班角色API
async function testRoles() {
  try {
    console.log('🎭 测试值班角色API: GET /api/shift-roles');
    const response = await fetch(`${API_BASE}/shift-roles`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 值班角色API正常 - 获取到', data.length, '个角色');
      return true;
    } else {
      console.log('❌ 值班角色API失败:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 值班角色API连接失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runQuickTest() {
  console.log('='.repeat(50));
  
  const employeeTest = await quickTest();
  const roleTest = await testRoles();
  
  console.log('='.repeat(50));
  console.log('📊 测试结果:');
  console.log('- 员工API:', employeeTest ? '✅ 正常' : '❌ 失败');
  console.log('- 值班角色API:', roleTest ? '✅ 正常' : '❌ 失败');
  
  if (employeeTest && roleTest) {
    console.log('🎉 所有API测试通过！');
    console.log('💡 现在可以测试以下页面:');
    console.log('  - 员工管理: http://localhost:9010/personnel/employees');
    console.log('  - 排班日历: http://localhost:9010/schedule/calendar');
    console.log('  - 值班角色配置: http://localhost:9010/schedule/roles');
  } else {
    console.log('⚠️ 部分API测试失败，请检查后端服务');
  }
  
  return { employeeTest, roleTest };
}

// 导出函数
window.quickTest = quickTest;
window.testRoles = testRoles;
window.runQuickTest = runQuickTest;

console.log('📝 快速API测试脚本已加载');
console.log('💡 运行 runQuickTest() 开始测试');