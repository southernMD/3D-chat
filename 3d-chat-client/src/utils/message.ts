import { ElMessage } from 'element-plus'
import type { MessageOptions } from 'element-plus'

// 默认配置
const defaultConfig: Partial<MessageOptions> = {
  duration: 3000,
  showClose: true,
  center: false,
  offset: 20,
  grouping: true
}

// 成功消息
export const showSuccess = (message: string, options?: Partial<MessageOptions>) => {
  return ElMessage({
    ...defaultConfig,
    message,
    type: 'success',
    duration: 3000,
    ...options
  })
}

// 错误消息
export const showError = (message: string, options?: Partial<MessageOptions>) => {
  return ElMessage({
    ...defaultConfig,
    message,
    type: 'error',
    duration: 4000,
    ...options
  })
}

// 警告消息
export const showWarning = (message: string, options?: Partial<MessageOptions>) => {
  return ElMessage({
    ...defaultConfig,
    message,
    type: 'warning',
    duration: 3000,
    ...options
  })
}

// 信息消息
export const showInfo = (message: string, options?: Partial<MessageOptions>) => {
  return ElMessage({
    ...defaultConfig,
    message,
    type: 'info',
    duration: 3000,
    ...options
  })
}

// 通用消息
export const showMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options?: Partial<MessageOptions>) => {
  const duration = type === 'error' ? 4000 : 3000
  
  return ElMessage({
    ...defaultConfig,
    message,
    type,
    duration,
    ...options
  })
}

// 导出默认的消息函数
export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  message: showMessage
}
