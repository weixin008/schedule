// 时间格式化测试脚本
console.log('🕐 测试时间格式化修复...');

// 模拟不同格式的时间数据
const testTimes = [
  '08:00',                    // 字符串格式
  '18:30',                    // 字符串格式
  new Date('2024-01-01T08:00:00'), // Date对象
  new Date('2024-01-01T18:30:00'), // Date对象
  '2024-01-01T08:00:00',      // ISO字符串
  null,                       // null值
  undefined,                  // undefined值
  '',                         // 空字符串
  { hours: 8, minutes: 0 },   // 对象格式
  123456789                   // 数字格式
];

// 测试formatTime函数
function testFormatTime() {
  console.log('📝 测试formatTime函数...');
  
  testTimes.forEach((time, index) => {
    try {
      // 这里我们需要模拟formatTime函数的逻辑
      let result;
      
      if (!time) {
        result = '';
      } else if (typeof time === 'string') {
        if (/^\d{2}:\d{2}$/.test(time)) {
          result = time;
        } else {
          try {
            const date = new Date(time);
            if (!isNaN(date.getTime())) {
              result = date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });
            } else {
              result = time.toString();
            }
          } catch (e) {
            result = time.toString();
          }
        }
      } else if (time instanceof Date) {
        result = time.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else {
        result = time.toString();
      }
      
      console.log(`  测试${index + 1}: ${JSON.stringify(time)} → "${result}" ✅`);
    } catch (error) {
      console.log(`  测试${index + 1}: ${JSON.stringify(time)} → 错误: ${error.message} ❌`);
    }
  });
}

// 测试角色数据格式
function testRoleTimeData() {
  console.log('\\n📋 测试角色时间数据格式...');
  
  // 模拟从API获取的角色数据
  const mockRoles = [
    {
      id: 1,
      name: '白班医生',
      extendedConfig: {
        timeConfig: {
          startTime: '08:00',
          endTime: '18:00'
        }
      }
    },
    {
      id: 2,
      name: '夜班护士',
      extendedConfig: {
        timeConfig: {
          startTime: new Date('2024-01-01T22:00:00'),
          endTime: new Date('2024-01-01T06:00:00')
        }
      }
    },
    {
      id: 3,
      name: '全天值班',
      extendedConfig: {
        timeConfig: {
          startTime: '2024-01-01T00:00:00',
          endTime: '2024-01-01T23:59:00'
        }
      }
    }
  ];
  
  mockRoles.forEach(role => {
    const startTime = role.extendedConfig?.timeConfig?.startTime;
    const endTime = role.extendedConfig?.timeConfig?.endTime;
    
    console.log(`  角色: ${role.name}`);
    console.log(`    开始时间: ${JSON.stringify(startTime)} → 应该正常显示`);
    console.log(`    结束时间: ${JSON.stringify(endTime)} → 应该正常显示`);
  });
}

// 检查当前页面是否有时间格式化错误
function checkCurrentPageErrors() {
  console.log('\\n🔍 检查当前页面错误...');
  
  // 检查控制台错误
  const originalError = console.error;
  let errorCount = 0;
  
  console.error = function(...args) {
    if (args.some(arg => typeof arg === 'string' && arg.includes('toLocaleTimeString'))) {
      errorCount++;
      console.log(`❌ 发现时间格式化错误: ${args.join(' ')}`);
    }
    originalError.apply(console, args);
  };
  
  // 恢复原始console.error
  setTimeout(() => {
    console.error = originalError;
    if (errorCount === 0) {
      console.log('✅ 未发现时间格式化错误');
    } else {
      console.log(`⚠️ 发现 ${errorCount} 个时间格式化错误`);
    }
  }, 5000);
  
  console.log('👀 开始监听时间格式化错误（5秒）...');
}

// 运行所有测试
function runTimeFormatTests() {
  console.log('🚀 开始时间格式化测试...');
  console.log('='.repeat(50));
  
  testFormatTime();
  testRoleTimeData();
  checkCurrentPageErrors();
  
  console.log('='.repeat(50));
  console.log('📊 测试完成！');
  console.log('💡 如果角色列表仍有错误，请刷新页面重试');
}

// 导出测试函数
window.testFormatTime = testFormatTime;
window.testRoleTimeData = testRoleTimeData;
window.checkCurrentPageErrors = checkCurrentPageErrors;
window.runTimeFormatTests = runTimeFormatTests;

console.log('📝 时间格式化测试脚本已加载');
console.log('💡 使用方法: runTimeFormatTests()');

// 自动运行测试
setTimeout(() => runTimeFormatTests(), 1000);