// 性能监控工具
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // 开始计时
  startTiming(label: string): void {
    performance.mark(`${label}-start`);
  }

  // 结束计时
  endTiming(label: string): number {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label, 'measure')[0];
    const duration = measure.duration;
    
    // 记录到指标中
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    // 清理性能标记
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
    
    return duration;
  }

  // 获取平均性能
  getAverageTime(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  // 获取所有指标
  getAllMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    this.metrics.forEach((times, label) => {
      result[label] = {
        average: this.getAverageTime(label),
        count: times.length,
        latest: times[times.length - 1] || 0
      };
    });
    
    return result;
  }

  // 清除指标
  clearMetrics(): void {
    this.metrics.clear();
  }

  // 记录API调用性能
  async measureApiCall<T>(label: string, apiCall: () => Promise<T>): Promise<T> {
    this.startTiming(label);
    try {
      const result = await apiCall();
      const duration = this.endTiming(label);
      
      // 如果API调用超过2秒，发出警告
      if (duration > 2000) {
        console.warn(`API调用 ${label} 耗时过长: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      this.endTiming(label);
      throw error;
    }
  }

  // 记录组件渲染性能
  measureComponentRender(componentName: string, renderFn: () => void): void {
    this.startTiming(`render-${componentName}`);
    renderFn();
    const duration = this.endTiming(`render-${componentName}`);
    
    // 如果渲染超过100ms，发出警告
    if (duration > 100) {
      console.warn(`组件 ${componentName} 渲染耗时过长: ${duration.toFixed(2)}ms`);
    }
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 装饰器：自动测量方法性能
export function measurePerformance(label?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const measureLabel = label || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      return await performanceMonitor.measureApiCall(measureLabel, () => method.apply(this, args));
    };
  };
}

// Vue组合式函数：性能监控
export function usePerformanceMonitor() {
  const startTiming = (label: string) => performanceMonitor.startTiming(label);
  const endTiming = (label: string) => performanceMonitor.endTiming(label);
  const getMetrics = () => performanceMonitor.getAllMetrics();
  const measureApiCall = <T>(label: string, apiCall: () => Promise<T>) => 
    performanceMonitor.measureApiCall(label, apiCall);

  return {
    startTiming,
    endTiming,
    getMetrics,
    measureApiCall
  };
}