import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { showSuccess, showError } from '@/utils/message'

// 用户信息接口
export interface User {
  id: number
  email: string
  username?: string
  avatar_url?: string
  is_verified: boolean
  created_at: string
}

// 注册参数接口
export interface RegisterParams {
  email: string
  username: string  // 改为必填
  password: string
  verificationCode: string
}

// API响应接口
interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  // 计算属性 - 只要有 token 就认为已认证，用户信息可以后续获取
  const isAuthenticated = computed(() => !!token.value)
  const isVerified = computed(() => user.value?.is_verified ?? false)

  // API基础URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  // HTTP请求工具函数
  const request = async <T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { Authorization: `Bearer ${token.value}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error: any) {
      throw error
    }
  }

  // 设置认证信息
  const setAuth = (authData: { user: User; token: string }, remember: boolean = false) => {
    user.value = authData.user
    token.value = authData.token
    
    if (remember) {
      // 记住我：保存到localStorage（持久化）
      localStorage.setItem('auth_token', authData.token)
      localStorage.setItem('auth_user', JSON.stringify(authData.user))
      localStorage.setItem('remember_me', 'true')
    } else {
      // 不记住我：保存到sessionStorage（会话级别）
      sessionStorage.setItem('auth_token', authData.token)
      sessionStorage.setItem('auth_user', JSON.stringify(authData.user))
      // 清除localStorage中的数据
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('remember_me')
    }
  }

  // 清除认证信息
  const clearAuth = () => {
    user.value = null
    token.value = null
    
    // 清除localStorage和sessionStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('remember_me')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
  }

  // 用户注册
  const register = async (params: RegisterParams): Promise<boolean> => {
    try {
      loading.value = true

      const response = await request<ApiResponse<{ user: User; token: string }>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      })

      if (response.success) {
        // 注册成功后自动设置认证信息
        if (response.data) {
          setAuth(response.data)
        }
        showSuccess(response.message || '注册成功，已自动登录！')
        return true
      } else {
        showError(response.message || '注册失败，请检查输入信息')
        return false
      }
    } catch (error: any) {
      showError(error.message || '网络错误，请稍后重试')
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户登录
  const login = async (loginField: string, password: string, remember: boolean = false): Promise<boolean> => {
    try {
      loading.value = true

      const response = await request<ApiResponse<{ user: User; token: string }>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginField, password }),
      })
      if (response.success && response.data) {
        setAuth(response.data, remember)
        showSuccess(response.message || '登录成功！')
        return true
      } else {
        showError(response.message || '登录失败，请检查邮箱/用户名和密码')
        return false
      }
    } catch (error: any) {
      showError(error.message || '网络错误，请稍后重试')
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户登出
  const logout = () => {
    clearAuth()
  }

  // 验证邮箱
  const verifyEmail = async (verificationToken: string): Promise<boolean> => {
    try {
      loading.value = true
      
      const response = await request<ApiResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: verificationToken }),
      })

      if (response.success) {
        ElMessage.success(response.message)
        return true
      } else {
        ElMessage.error(response.message)
        return false
      }
    } catch (error: any) {
      ElMessage.error(error.message || '邮箱验证失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 重新发送验证邮件
  const resendVerification = async (email: string): Promise<boolean> => {
    try {
      loading.value = true
      
      const response = await request<ApiResponse>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      if (response.success) {
        ElMessage.success(response.message)
        return true
      } else {
        ElMessage.error(response.message)
        return false
      }
    } catch (error: any) {
      ElMessage.error(error.message || '重新发送验证邮件失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取当前用户信息
  const fetchUserInfo = async (clearOnError: boolean = true, silent: boolean = false): Promise<boolean> => {
    try {
      loading.value = true
      
      const response = await request<ApiResponse>('/auth/me', {
        method: 'GET',
      })
      
      // 如果是静默模式且网络错误，直接返回 false
      if (!response.success && silent) {
        return false
      }
      
      if (response.success && response.data) {
        user.value = response.data.user
        
        // 根据是否记住我来保存用户信息
        const isRemembered = localStorage.getItem('remember_me') === 'true'
        if (isRemembered) {
          localStorage.setItem('auth_user', JSON.stringify(response.data.user))
        } else {
          sessionStorage.setItem('auth_user', JSON.stringify(response.data.user))
        }
        
        return true
      } else {
        if (clearOnError) {
          clearAuth()
        }
        return false
      }
    } catch (error: any) {
      if (!silent) {
        console.error('Failed to fetch user info:', error)
      }
      if (clearOnError) {
        clearAuth()
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // 检查认证状态
  const checkAuth = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      return await fetchUserInfo()
    } catch (error) {
      clearAuth()
      return false
    }
  }

  // 初始化认证状态
  const initAuth = async () => {
    try {
      // 如果有 token，在后台静默验证，不阻塞初始化
        // 使用静默模式，不显示错误消息，不清除认证状态
      if(!token.value)token.value = localStorage.getItem('auth_token')
      fetchUserInfo(false, true)
        .then((success) => {
          if (success) {
            console.log('Token verified successfully on init')
          }
        })
        .catch(() => {
          clearAuth()
        })
    } catch (error) {
      showError('登录状态已过期')
    }
  }

  return {
    // 状态
    user,
    token,
    loading,
    
    // 计算属性
    isAuthenticated,
    isVerified,
    
    // 方法
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    fetchUserInfo,
    checkAuth,
    initAuth,
    setAuth,
    clearAuth,
  }
})
