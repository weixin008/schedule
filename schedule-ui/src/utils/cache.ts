// 数据缓存管理器
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 默认5分钟过期

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // 设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 检查缓存是否存在且有效
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清除所有缓存
  clear(): void {
    this.cache.clear();
  }

  // 清除过期缓存
  clearExpired(): number {
    let cleared = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  // 获取缓存统计信息
  getStats(): {
    total: number;
    expired: number;
    size: number;
  } {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      expired,
      size: this.getMemoryUsage()
    };
  }

  // 估算内存使用量（字节）
  private getMemoryUsage(): number {
    let size = 0;
    for (const [key, item] of this.cache.entries()) {
      size += key.length * 2; // 字符串按UTF-16计算
      size += JSON.stringify(item.data).length * 2;
      size += 16; // timestamp和expiry
    }
    return size;
  }

  // 设置默认TTL
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// 导出单例实例
export const cacheManager = CacheManager.getInstance();

// 缓存装饰器
export function cached(key?: string, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cacheKey = key || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const fullKey = `${cacheKey}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cached = cacheManager.get(fullKey);
      if (cached !== null) {
        console.log(`缓存命中: ${fullKey}`);
        return cached;
      }

      // 执行原方法
      const result = await method.apply(this, args);
      
      // 缓存结果
      cacheManager.set(fullKey, result, ttl);
      console.log(`缓存设置: ${fullKey}`);
      
      return result;
    };
  };
}

// Vue组合式函数：缓存管理
export function useCache() {
  const setCache = <T>(key: string, data: T, ttl?: number) => cacheManager.set(key, data, ttl);
  const getCache = <T>(key: string) => cacheManager.get<T>(key);
  const hasCache = (key: string) => cacheManager.has(key);
  const deleteCache = (key: string) => cacheManager.delete(key);
  const clearCache = () => cacheManager.clear();
  const getStats = () => cacheManager.getStats();

  return {
    setCache,
    getCache,
    hasCache,
    deleteCache,
    clearCache,
    getStats
  };
}

// 自动清理过期缓存
setInterval(() => {
  const cleared = cacheManager.clearExpired();
  if (cleared > 0) {
    console.log(`自动清理了 ${cleared} 个过期缓存项`);
  }
}, 60000); // 每分钟清理一次