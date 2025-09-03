import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9020/api', // 使用环境变量或默认值
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // 移除模拟token，确保用户必须正确登录
  return config
}, error => {
  return Promise.reject(error)
})

// 响应拦截器
api.interceptors.response.use(response => {
  return response
}, error => {
  if (error.response?.status === 401) {
    console.warn('API认证失败，请检查后端认证配置')
    localStorage.removeItem('token')
    // 在开发环境下，可以考虑使用模拟数据
    if (import.meta.env.DEV) {
      console.log('开发环境：建议临时禁用后端认证或配置正确的token')
    }
  }
  return Promise.reject(error)
})

export default api