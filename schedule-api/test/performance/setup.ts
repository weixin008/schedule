// 性能测试设置
beforeAll(() => {
  console.log('🚀 Starting performance tests...');
  console.log('Node version:', process.version);
  console.log('Memory limit:', process.memoryUsage());
});

afterAll(() => {
  console.log('✅ Performance tests completed');
  console.log('Final memory usage:', process.memoryUsage());
});