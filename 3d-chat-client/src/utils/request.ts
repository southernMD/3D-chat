// HTTP请求工具函数
export interface RequestConfig extends RequestInit {
  // 扩展配置选项
  timeout?: number
  baseURL?: string
  skipAuth?: boolean // 跳过自动添加认证头
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  total?: number
}

// 请求错误类
export class RequestError extends Error {
  public status: number
  public response?: Response

  constructor(message: string, status: number, response?: Response) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.response = response
  }
}

// 获取API基础URL
const getBaseURL = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
}

// 获取认证token
const getAuthToken = (): string | null => {
  // 优先从localStorage获取（记住我），然后从sessionStorage获取
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

// 创建请求配置
const createRequestConfig = (config: RequestConfig = {}): RequestInit => {
  const { 
    timeout = 10000, 
    baseURL, 
    skipAuth = false, 
    headers = {}, 
    ...restConfig 
  } = config

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // 自动添加认证头（除非明确跳过）
  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`
    }
  }

  return {
    headers: requestHeaders,
    ...restConfig,
  }
}

// 处理响应
const handleResponse = async <T = any>(response: Response): Promise<T> => {
  let data: any

  try {
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }
  } catch (error) {
    throw new RequestError('Failed to parse response', response.status, response)
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP error! status: ${response.status}`
    throw new RequestError(message, response.status, response)
  }

  return data
}

// 主要的请求函数
export const request = async <T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> => {
  const { baseURL, timeout = 10000, ...requestConfig } = config
  const url = `${baseURL || getBaseURL()}${endpoint}`
  
  const finalConfig = createRequestConfig(requestConfig)

  // 创建AbortController用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...finalConfig,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return await handleResponse<T>(response)
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new RequestError('Request timeout', 408)
    }
    
    if (error instanceof RequestError) {
      throw error
    }
    
    throw new RequestError(error.message || 'Network error', 0)
  }
}

// 便捷方法
export const get = <T = any>(endpoint: string, config?: RequestConfig): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'GET' })
}

export const post = <T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> => {
  return request<T>(endpoint, {
    ...config,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

export const put = <T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> => {
  return request<T>(endpoint, {
    ...config,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

export const del = <T = any>(endpoint: string, config?: RequestConfig): Promise<T> => {
  return request<T>(endpoint, { ...config, method: 'DELETE' })
}

export const patch = <T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> => {
  return request<T>(endpoint, {
    ...config,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

// 文件上传专用方法
export const upload = <T = any>(
  endpoint: string, 
  formData: FormData, 
  config?: Omit<RequestConfig, 'headers'>
): Promise<T> => {
  return request<T>(endpoint, {
    ...config,
    method: 'POST',
    body: formData,
    headers: {
      // 不设置Content-Type，让浏览器自动设置multipart/form-data边界
      ...(config?.headers || {}),
    },
  })
}

