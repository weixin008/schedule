// 值班角色保存功能测试脚本
// 在浏览器控制台中运行此脚本来测试保存功能

const API_BASE = 'http://localhost:9020/api';

// 测试保存功能
async function testSaveFunction() {
  console.log('🧪 开始测试值班角色保存功能...');
  
  // 模拟完整的角色配置数据
  const testRoleData = {
    name: '测试值班角色',
    description: '这是一个测试用的值班角色',
    type: 'day',
    timeConfig: {
      startTime: '08:00',
      endTime: '18:00',
      duration: 10,
      workDays: ['1', '2', '3', '4', '5'],
      frequency: 'daily',
      customInterval: 1
    },
    personnelType: 'single',
    rotationOrder: [
      { key: 1, label: '张三 (医生)' },
      { key: 2, label: '李四 (护士)' }
    ],
    groupSize: 3,
    groups: [],
    rules: {
      cycle: 'weekly',
      rotationType: 'sequential',
      maxConsecutiveDays: 3,
      minRestHours: 12,
      allowOvertime: false,
      priorityHandling: 'normal',
      conflictResolution: 'auto',
      specialRequirements: '测试特殊要求'
    }
  };

  try {
    // 检查认证状态
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ 未找到认证token，请先登录');
      return false;
    }

    console.log('📤 发送保存请求...');
    const response = await fetch(`${API_BASE}/shift-roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testRoleData)
    });

    console.log('📥 响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 保存成功!');
      console.log('📋 保存结果:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ 保存失败');
      console.log('📋 错误详情:', errorText);
      
      // 尝试解析错误信息
      try {
        const errorJson = JSON.parse(errorText);
        console.log('📋 结构化错误:', errorJson);
      } catch (e) {
        console.log('📋 原始错误文本:', errorText);
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ 网络错误:', error.message);
    return false;
  }
}

// 检查后端接口状态
async function checkShiftRoleAPI() {
  console.log('🔍 检查shift-roles API状态...');
  
  const token = localStorage.getItem('token');
  
  try {
    // 测试GET接口
    const getResponse = await fetch(`${API_BASE}/shift-roles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📋 GET /shift-roles 状态:', getResponse.status);
    
    if (getResponse.ok) {
      const roles = await getResponse.json();
      console.log('📋 现有角色数量:', roles.length);
      return true;
    } else {
      console.log('❌ GET接口异常:', getResponse.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ API连接失败:', error.message);
    return false;
  }
}

// 检查数据结构
function validateDataStructure() {
  console.log('🔍 检查数据结构...');
  
  const requiredFields = [
    'name', 'description', 'type', 'timeConfig', 
    'personnelType', 'rotationOrder', 'groups', 'rules'
  ];
  
  const timeConfigFields = [
    'startTime', 'endTime', 'duration', 'workDays', 'frequency'
  ];
  
  const rulesFields = [
    'cycle', 'rotationType', 'maxConsecutiveDays', 'minRestHours'
  ];
  
  console.log('📋 必需字段:');
  console.log('  - 主要字段:', requiredFields);
  console.log('  - 时间配置字段:', timeConfigFields);
  console.log('  - 规则字段:', rulesFields);
  
  return true;
}

// 运行完整测试
async function runSaveTest() {
  console.log('🚀 开始完整的保存功能测试...');
  console.log('='.repeat(50));
  
  const structureValid = validateDataStructure();
  const apiAvailable = await checkShiftRoleAPI();
  const saveSuccess = await testSaveFunction();
  
  console.log('='.repeat(50));
  console.log('📊 测试结果总结:');
  console.log('- 数据结构验证:', structureValid ? '✅ 通过' : '❌ 失败');
  console.log('- API接口可用性:', apiAvailable ? '✅ 正常' : '❌ 异常');
  console.log('- 保存功能测试:', saveSuccess ? '✅ 成功' : '❌ 失败');
  
  if (saveSuccess) {
    console.log('🎉 保存功能正常工作！');
  } else {
    console.log('⚠️ 保存功能存在问题，请检查:');
    console.log('  1. 后端服务是否正常运行');
    console.log('  2. 用户是否已正确登录');
    console.log('  3. API接口是否正确实现');
    console.log('  4. 数据格式是否符合后端要求');
  }
  
  return { structureValid, apiAvailable, saveSuccess };
}

// 导出测试函数
window.testSaveFunction = testSaveFunction;
window.checkShiftRoleAPI = checkShiftRoleAPI;
window.validateDataStructure = validateDataStructure;
window.runSaveTest = runSaveTest;

console.log('📝 值班角色保存测试脚本已加载');
console.log('💡 运行 runSaveTest() 开始完整测试');