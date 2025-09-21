import { post, get, type ApiResponse } from '@/utils/request'

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
  username: string
  password: string
  verificationCode: string
}

// 登录参数接口
export interface LoginParams {
  email: string
  password: string
}

// 认证响应接口
export interface AuthResponse {
  user: User
  token: string
}

// 发送注册验证码
export const sendRegisterCode = async (email: string): Promise<ApiResponse> => {
  try {
    const response = await post<ApiResponse>('/auth/send-register-code', { email }, {
      skipAuth: true // 发送验证码时不需要认证
    })
    return response
  } catch (error: any) {
    throw new Error(error.message || '发送验证码失败')
  }
}

// 用户注册
export const registerUser = async (params: RegisterParams): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await post<ApiResponse<AuthResponse>>('/auth/register', params, {
      skipAuth: true // 注册时不需要认证
    })
    return response
  } catch (error: any) {
    throw new Error(error.message || '注册失败')
  }
}

// 用户登录
export const loginUser = async (params: LoginParams): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await post<ApiResponse<AuthResponse>>('/auth/login', params, {
      skipAuth: true // 登录时不需要认证
    })
    return response
  } catch (error: any) {
    throw new Error(error.message || '登录失败')
  }
}

// 获取当前用户信息
export const getCurrentUser = async (): Promise<ApiResponse<{ user: User }>> => {
  try {
    const response = await get<ApiResponse<{ user: User }>>('/auth/me')
    return response
  } catch (error: any) {
    throw new Error(error.message || '获取用户信息失败')
  }
}
