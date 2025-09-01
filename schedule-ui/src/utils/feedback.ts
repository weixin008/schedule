import { ElMessage, ElNotification, ElLoading } from 'element-plus';
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading';

// 反馈类型
export type FeedbackType = 'success' | 'warning' | 'info' | 'error';

// 加载状态管理
class LoadingManager {
  private loadingInstances: Map<string, LoadingInstance> = new Map();

  show(key: string, text: string = '加载中...', target?: string | HTMLElement): void {
    // 如果已经有相同key的loading，先关闭
    this.hide(key);

    const loading = ElLoading.service({
      lock: true,
      text,
      target: target || 'body',
      background: 'rgba(0, 0, 0, 0.7)'
    });

    this.loadingInstances.set(key, loading);
  }

  hide(key: string): void {
    const loading = this.loadingInstances.get(key);
    if (loading) {
      loading.close();
      this.loadingInstances.delete(key);
    }
  }

  hideAll(): void {
    this.loadingInstances.forEach(loading => loading.close());
    this.loadingInstances.clear();
  }
}

// 消息管理
class MessageManager {
  private messageQueue: Array<{ type: FeedbackType; message: string; duration?: number }> = [];
  private isProcessing = false;

  // 显示消息
  show(type: FeedbackType, message: string, duration: number = 3000): void {
    this.messageQueue.push({ type, message, duration });
    this.processQueue();
  }

  // 处理消息队列
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const { type, message, duration } = this.messageQueue.shift()!;
      
      ElMessage({
        type,
        message,
        duration,
        showClose: true
      });

      // 等待一小段时间再显示下一个消息
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.isProcessing = false;
  }

  // 显示通知
  notify(type: FeedbackType, title: string, message: string, duration: number = 4500): void {
    ElNotification({
      type,
      title,
      message,
      duration,
      position: 'top-right'
    });
  }

  // 成功消息
  success(message: string, duration?: number): void {
    this.show('success', message, duration);
  }

  // 错误消息
  error(message: string, duration?: number): void {
    this.show('error', message, duration);
  }

  // 警告消息
  warning(message: string, duration?: number): void {
    this.show('warning', message, duration);
  }

  // 信息消息
  info(message: string, duration?: number): void {
    this.show('info', message, duration);
  }
}

// 错误处理器
class ErrorHandler {
  // 处理API错误
  handleApiError(error: any, context?: string): string {
    let message = '操作失败';

    if (error.response) {
      // 服务器响应错误
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          message = data?.message || '请求参数错误';
          break;
        case 401:
          message = '登录已过期，请重新登录';
          // 可以在这里触发登录跳转
          break;
        case 403:
          message = '没有权限执行此操作';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 422:
          message = data?.message || '数据验证失败';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        default:
          message = data?.message || `请求失败 (${status})`;
      }
    } else if (error.request) {
      // 网络错误
      message = '网络连接失败，请检查网络设置';
    } else {
      // 其他错误
      message = error.message || '未知错误';
    }

    if (context) {
      message = `${context}: ${message}`;
    }

    return message;
  }

  // 处理业务逻辑错误
  handleBusinessError(error: any, context?: string): string {
    const message = error.message || '业务处理失败';
    return context ? `${context}: ${message}` : message;
  }
}

// 反馈管理器
export class FeedbackManager {
  private static instance: FeedbackManager;
  private loading = new LoadingManager();
  private message = new MessageManager();
  private errorHandler = new ErrorHandler();

  static getInstance(): FeedbackManager {
    if (!FeedbackManager.instance) {
      FeedbackManager.instance = new FeedbackManager();
    }
    return FeedbackManager.instance;
  }

  // 加载状态
  showLoading(key: string, text?: string, target?: string | HTMLElement): void {
    this.loading.show(key, text, target);
  }

  hideLoading(key: string): void {
    this.loading.hide(key);
  }

  hideAllLoading(): void {
    this.loading.hideAll();
  }

  // 消息反馈
  success(message: string, duration?: number): void {
    this.message.success(message, duration);
  }

  error(message: string, duration?: number): void {
    this.message.error(message, duration);
  }

  warning(message: string, duration?: number): void {
    this.message.warning(message, duration);
  }

  info(message: string, duration?: number): void {
    this.message.info(message, duration);
  }

  // 通知
  notify(type: FeedbackType, title: string, message: string, duration?: number): void {
    this.message.notify(type, title, message, duration);
  }

  // 错误处理
  handleError(error: any, context?: string): void {
    const message = this.errorHandler.handleApiError(error, context);
    this.error(message);
    console.error(context || 'Error:', error);
  }

  // 异步操作包装器
  async withLoading<T>(
    key: string,
    operation: () => Promise<T>,
    loadingText?: string,
    successMessage?: string
  ): Promise<T> {
    this.showLoading(key, loadingText);
    
    try {
      const result = await operation();
      
      if (successMessage) {
        this.success(successMessage);
      }
      
      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.hideLoading(key);
    }
  }
}

// 导出单例实例
export const feedback = FeedbackManager.getInstance();

// Vue组合式函数：反馈管理
export function useFeedback() {
  const showLoading = (key: string, text?: string, target?: string | HTMLElement) => 
    feedback.showLoading(key, text, target);
  const hideLoading = (key: string) => feedback.hideLoading(key);
  const success = (message: string, duration?: number) => feedback.success(message, duration);
  const error = (message: string, duration?: number) => feedback.error(message, duration);
  const warning = (message: string, duration?: number) => feedback.warning(message, duration);
  const info = (message: string, duration?: number) => feedback.info(message, duration);
  const handleError = (error: any, context?: string) => feedback.handleError(error, context);
  const withLoading = <T>(key: string, operation: () => Promise<T>, loadingText?: string, successMessage?: string) =>
    feedback.withLoading(key, operation, loadingText, successMessage);

  return {
    showLoading,
    hideLoading,
    success,
    error,
    warning,
    info,
    handleError,
    withLoading
  };
}