import { get, type ApiResponse } from '@/utils/request'

// 模型信息接口
export interface ModelInfo {
  id: number
  hash: string
  name: string | null
  size: string
  description: string | null
  createdBy: {
    id: number
    nickname: string
    email: string
  } | null
  createTime: string
  updateTime: string
  picPath: string | null
}

// 资源文件信息接口
export interface ResourceInfo {
  id: number
  path: string
  ext: string
  createTime: string
  updateTime: string
}

// 模型详细信息接口
export interface ModelDetailInfo {
  resources: ResourceInfo[]
  totalResources: number
  resourceTypes: string[]
}

// API响应接口
export interface ModelListResponse extends ApiResponse<ModelInfo[]> {}
export interface ModelDetailResponse extends ApiResponse<ModelDetailInfo> {}

// 获取模型列表
export const getModelList = async (): Promise<ModelListResponse> => {
  try {
    const response = await get<ModelListResponse>('/file/models')
    return response
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取模型列表失败',
      error: error instanceof Error ? error.message : '获取模型列表失败'
    }
  }
}

// 格式化文件大小
export const formatFileSize = (sizeStr: string): string => {
  const size = parseInt(sizeStr)
  if (isNaN(size)) return sizeStr
  
  if (size === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(size) / Math.log(k))
  
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取模型预览图URL
export const getModelPreviewUrl = (picPath: string | null): string => {
  if (!picPath) {
    return '' // 返回默认图片或空字符串
  }

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  // 如果是相对路径，拼接完整URL
  if (picPath.startsWith('/') || picPath.startsWith('screenshots/')) {
    return `${baseUrl.replace('/api', '')}/models/${picPath}`
  }

  return picPath
}

// 根据hash获取模型文件路径列表
export const getModelFilePathByHash = async (hash: string)=> {
  try {
    const response = await get<ModelDetailResponse>(`/file/models/${hash}`)

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || '获取模型信息失败'
      }
    }
    const modelDetail = response.data
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    response.data.resources = modelDetail.resources.map((resource) => {
      resource.path = `${baseUrl.replace('/api', '')}${resource.path}`
      return resource
    })

    return response
  } catch (error) {
    console.error('获取模型文件路径失败:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取模型详细信息失败',
      error: error instanceof Error ? error.message : '获取模型详细信息失败',
      data: null
    }
  }
}

