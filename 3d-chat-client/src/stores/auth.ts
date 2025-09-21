import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { showSuccess, showError } from '@/utils/message'
import {
  registerUser,
  loginUser,
  getCurrentUser,
  sendRegisterCode,
  type User,
  type RegisterParams
} from '@/api/authApi'

// 重新导出类型供其他模块使用
export type { User, RegisterParams }

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  // 计算属性 - 只要有 token 就认为已认证，用户信息可以后续获取
  const isAuthenticated = computed(() => !!token.value)
  const isVerified = computed(() => user.value?.is_verified ?? false)



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

      const response = await registerUser(params)

      if (response.success && response.data) {
        // 注册成功后自动设置认证信息
        setAuth(response.data)
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

      const response = await loginUser({ email: loginField, password })

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

  // 发送注册验证码
  const sendVerificationCode = async (email: string): Promise<boolean> => {
    try {
      loading.value = true

      const response = await sendRegisterCode(email)

      if (response.success) {
        showSuccess(response.message || '验证码发送成功')
        return true
      } else {
        showError(response.message || '发送验证码失败')
        return false
      }
    } catch (error: any) {
      showError(error.message || '发送验证码失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取当前用户信息
  const fetchUserInfo = async (clearOnError: boolean = true, silent: boolean = false): Promise<boolean> => {
    try {
      loading.value = true

      const response = await getCurrentUser()

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
    sendVerificationCode,
    fetchUserInfo,
    checkAuth,
    initAuth,
    setAuth,
    clearAuth,
  }
})
