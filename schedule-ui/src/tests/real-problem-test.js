// 真实问题测试脚本
// 专门测试用户反馈的具体问题

console.log('🔍 开始测试真实问题...');

// 测试1: 值班角色保存问题
function testRoleSaving() {
  console.log('\\n📝 测试1: 值班角色保存问题');
  console.log('请按以下步骤操作:');
  console.log('1. 访问 /schedule/roles 页面');
  console.log('2. 点击"新建角色"按钮');
  console.log('3. 填写角色信息并保存');
  console.log('4. 观察按钮状态和页面跳转');
  
  // 监听保存状态变化
  let saveButtonObserver;
  
  const observeSaveButton = () => {
    const saveButton = document.querySelector('button[type="success"]');
    if (saveButton) {
      console.log('✅ 找到保存按钮');
      
      // 监听按钮状态变化
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const isLoading = saveButton.classList.contains('is-loading');
            console.log(`🔄 按钮状态变化: ${isLoading ? 'Loading' : 'Normal'}`);
          }
        });
      });
      
      observer.observe(saveButton, { attributes: true });
      saveButtonObserver = observer;
      
      console.log('👀 开始监听保存按钮状态变化...');
    } else {
      console.log('❌ 未找到保存按钮，请确保在角色配置页面');
    }
  };
  
  // 延迟执行以确保页面加载完成
  setTimeout(observeSaveButton, 1000);
  
  return {
    stop: () => {
      if (saveButtonObserver) {
        saveButtonObserver.disconnect();
        console.log('⏹️ 停止监听保存按钮');
      }
    }
  };
}

// 测试2: 智能排班跳转问题
function testScheduleGeneration() {
  console.log('\\n⚡ 测试2: 智能排班跳转问题');
  console.log('请按以下步骤操作:');
  console.log('1. 访问 /schedule/engine 页面');
  console.log('2. 选择时间范围');
  console.log('3. 点击"开始生成排班"');
  console.log('4. 在弹窗中点击"查看日历"');
  console.log('5. 观察是否跳转到日历页面');
  
  // 监听路由变化
  let currentPath = window.location.pathname;
  console.log('📍 当前路径:', currentPath);
  
  const checkRouteChange = () => {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      console.log(`🔄 路由变化: ${currentPath} → ${newPath}`);
      currentPath = newPath;
      
      if (newPath === '/schedule/calendar') {
        console.log('✅ 成功跳转到日历页面！');
      }
    }
  };
  
  // 定期检查路由变化
  const routeChecker = setInterval(checkRouteChange, 500);
  
  return {
    stop: () => {
      clearInterval(routeChecker);
      console.log('⏹️ 停止监听路由变化');
    }
  };
}

// 测试3: 日历数据显示问题
async function testCalendarData() {
  console.log('\\n📅 测试3: 日历数据显示问题');
  
  try {
    // 直接测试API
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:9020/api/schedules', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const schedules = await response.json();
      console.log('✅ 排班API响应正常');
      console.log('📊 排班数据数量:', schedules.length);
      
      if (schedules.length > 0) {
        console.log('📝 第一条数据结构:', schedules[0]);
        
        // 检查数据完整性
        const firstSchedule = schedules[0];
        const hasEmployee = !!(firstSchedule.employee || firstSchedule.assignedPerson || firstSchedule.employeeName);
        const hasTime = !!(firstSchedule.start || (firstSchedule.date && firstSchedule.startTime));
        const hasTitle = !!(firstSchedule.title || firstSchedule.shift);
        
        console.log('🔍 数据完整性检查:');
        console.log(`  员工信息: ${hasEmployee ? '✅' : '❌'}`);
        console.log(`  时间信息: ${hasTime ? '✅' : '❌'}`);
        console.log(`  标题信息: ${hasTitle ? '✅' : '❌'}`);
        
        if (hasEmployee && hasTime && hasTitle) {
          console.log('✅ 数据结构完整，应该能正常显示');
        } else {
          console.log('⚠️ 数据结构不完整，可能影响显示');
        }
      } else {
        console.log('⚠️ 没有排班数据，请先生成排班');
      }
    } else {
      console.log('❌ 排班API响应异常:', response.status);
    }
  } catch (error) {
    console.log('❌ 测试排班API失败:', error.message);
  }
}

// 测试4: 员工信息获取问题
async function testEmployeeData() {
  console.log('\\n👥 测试4: 员工信息获取问题');
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:9020/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const employees = await response.json();
      console.log('✅ 员工API响应正常');
      console.log('📊 员工数据数量:', employees.length);
      
      if (employees.length > 0) {
        console.log('📝 第一个员工数据:', employees[0]);
        
        // 检查员工状态分布
        const statusCount = {};
        employees.forEach(emp => {
          statusCount[emp.status] = (statusCount[emp.status] || 0) + 1;
        });
        
        console.log('📊 员工状态分布:', statusCount);
        
        const onDutyCount = statusCount['ON_DUTY'] || 0;
        if (onDutyCount > 0) {
          console.log(`✅ 有 ${onDutyCount} 名在职员工，可以进行排班`);
        } else {
          console.log('⚠️ 没有在职员工，无法进行排班');
        }
      } else {
        console.log('⚠️ 没有员工数据，请先添加员工');
      }
    } else {
      console.log('❌ 员工API响应异常:', response.status);
    }
  } catch (error) {
    console.log('❌ 测试员工API失败:', error.message);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行所有真实问题测试...');
  console.log('='.repeat(60));
  
  // 测试API数据
  await testEmployeeData();
  await testCalendarData();
  
  // 测试UI交互（需要用户操作）
  const roleSaveTest = testRoleSaving();
  const scheduleGenTest = testScheduleGeneration();
  
  console.log('='.repeat(60));
  console.log('📋 测试说明:');
  console.log('- API测试已自动完成');
  console.log('- UI交互测试需要手动操作');
  console.log('- 请按照提示进行操作并观察结果');
  console.log('');
  console.log('🛑 停止测试请运行: stopTests()');
  
  // 导出停止函数
  window.stopTests = () => {
    roleSaveTest.stop();
    scheduleGenTest.stop();
    console.log('⏹️ 所有测试已停止');
  };
}

// 导出测试函数
window.testRoleSaving = testRoleSaving;
window.testScheduleGeneration = testScheduleGeneration;
window.testCalendarData = testCalendarData;
window.testEmployeeData = testEmployeeData;
window.runAllTests = runAllTests;

console.log('📝 真实问题测试脚本已加载');
console.log('💡 使用方法:');
console.log('  - runAllTests() - 运行所有测试');
console.log('  - testRoleSaving() - 仅测试角色保存');
console.log('  - testScheduleGeneration() - 仅测试排班生成');
console.log('  - testCalendarData() - 仅测试日历数据');
console.log('  - testEmployeeData() - 仅测试员工数据');
console.log('\\n🎯 现在运行: runAllTests()');

// 自动运行测试
setTimeout(() => runAllTests(), 1000);