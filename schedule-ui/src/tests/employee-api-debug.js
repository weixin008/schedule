// 员工API调试脚本
// 在浏览器控制台中运行此脚本来调试员工API问题

console.log('🔍 开始调试员工API问题...');

// 检查认证状态
function checkAuth() {
  const token = localStorage.getItem('token');
  console.log('🔐 认证检查:');
  console.log('- Token存在:', !!token);
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('- Token有效期:', new Date(payload.exp * 1000));
      console.log('- 当前时间:', new Date());
      console.log('- Token是否过期:', Date.now() > payload.exp * 1000);
    } catch (e) {
      console.log('- Token格式错误');
    }
  }
  return !!token;
}

// 测试不同的API调用方式
async function testAPIMethods() {
  console.log('\n📡 测试不同的API调用方式...');
  
  const token = localStorage.getItem('token');
  const baseURL = 'http://localhost:9020/api';
  
  // 方法1: 原生fetch (相对路径)
  console.log('\n1️⃣ 测试原生fetch (相对路径):');
  try {
    const response = await fetch('/api/employees');
    console.log('- 状态码:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('- 数据长度:', data.length);
    } else {
      console.log('- 错误:', response.statusText);
    }
  } catch (error) {
    console.log('- 异常:', error.message);
  }
  
  // 方法2: 原生fetch (完整URL)
  console.log('\n2️⃣ 测试原生fetch (完整URL):');
  try {
    const response = await fetch(`${baseURL}/employees`);
    console.log('- 状态码:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('- 数据长度:', data.length);
    } else {
      console.log('- 错误:', response.statusText);
    }
  } catch (error) {
    console.log('- 异常:', error.message);
  }
  
  // 方法3: 原生fetch (带认证头)
  console.log('\n3️⃣ 测试原生fetch (带认证头):');
  try {
    const response = await fetch(`${baseURL}/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('- 状态码:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('- 数据长度:', data.length);
      console.log('- 前3个员工:', data.slice(0, 3).map(emp => ({
        id: emp.id,
        name: emp.name,
        position: emp.organizationPosition || emp.position
      })));
    } else {
      const errorText = await response.text();
      console.log('- 错误:', response.statusText);
      console.log('- 错误详情:', errorText);
    }
  } catch (error) {
    console.log('- 异常:', error.message);
  }
  
  // 方法4: 使用axios (如果可用)
  console.log('\n4️⃣ 测试axios (如果可用):');
  if (window.axios) {
    try {
      const response = await window.axios.get(`${baseURL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('- 状态码:', response.status);
      console.log('- 数据长度:', response.data.length);
    } catch (error) {
      console.log('- 异常:', error.response?.status, error.response?.statusText);
    }
  } else {
    console.log('- axios不可用');
  }
}

// 检查后端服务状态
async function checkBackendStatus() {
  console.log('\n🖥️ 检查后端服务状态...');
  
  const baseURL = 'http://localhost:9020';
  
  try {
    // 检查健康状态
    const healthResponse = await fetch(`${baseURL}/api/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ 后端服务正常:', health.message);
    } else {
      console.log('❌ 健康检查失败:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ 无法连接后端服务:', error.message);
    console.log('💡 请确认后端服务是否在 http://localhost:9020 运行');
  }
}

// 检查数据库数据
async function checkDatabaseData() {
  console.log('\n🗄️ 检查数据库数据...');
  
  const token = localStorage.getItem('token');
  const baseURL = 'http://localhost:9020/api';
  
  try {
    const response = await fetch(`${baseURL}/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const employees = await response.json();
      console.log('📊 数据库员工统计:');
      console.log('- 总员工数:', employees.length);
      console.log('- 有组织岗位的员工:', employees.filter(emp => emp.organizationPosition).length);
      console.log('- 有普通岗位的员工:', employees.filter(emp => emp.position).length);
      console.log('- 有标签的员工:', employees.filter(emp => emp.tags && emp.tags.length > 0).length);
      
      if (employees.length > 0) {
        console.log('📋 员工数据示例:');
        employees.slice(0, 5).forEach((emp, i) => {
          console.log(`  ${i+1}. ${emp.name} - ${emp.organizationPosition || emp.position || '未分配'} (ID: ${emp.id})`);
        });
      } else {
        console.log('⚠️ 数据库中没有员工数据');
        console.log('💡 请检查数据库初始化是否正常');
      }
    } else {
      console.log('❌ 获取员工数据失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ 数据库查询异常:', error.message);
  }
}

// 运行完整诊断
async function runFullDiagnosis() {
  console.log('🚀 开始完整的员工API诊断...');
  console.log('='.repeat(60));
  
  const hasAuth = checkAuth();
  await checkBackendStatus();
  await testAPIMethods();
  await checkDatabaseData();
  
  console.log('='.repeat(60));
  console.log('📋 诊断总结:');
  console.log('- 认证状态:', hasAuth ? '✅ 正常' : '❌ 缺失');
  console.log('- 建议操作:');
  
  if (!hasAuth) {
    console.log('  1. 请先登录系统获取认证token');
  } else {
    console.log('  1. 使用带认证头的API调用');
    console.log('  2. 确认后端服务运行在正确端口');
    console.log('  3. 检查数据库是否有员工数据');
  }
  
  console.log('\n💡 修复建议:');
  console.log('  - 在值班角色配置页面中使用配置好的API实例');
  console.log('  - 确保所有API调用都包含认证头');
  console.log('  - 使用完整的baseURL而不是相对路径');
}

// 导出函数供手动调用
window.checkAuth = checkAuth;
window.testAPIMethods = testAPIMethods;
window.checkBackendStatus = checkBackendStatus;
window.checkDatabaseData = checkDatabaseData;
window.runFullDiagnosis = runFullDiagnosis;

console.log('📝 员工API调试脚本已加载');
console.log('💡 运行 runFullDiagnosis() 开始完整诊断');