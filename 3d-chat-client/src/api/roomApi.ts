import { post, get, del } from '@/utils/request'
import type { ApiResponse } from '@/utils/request'

// 房间配置接口
export interface RoomConfig {
  name: string
  description: string
  maxUsers: string
  isPrivate: boolean
  enableVoice: boolean
  enableText: boolean
  map: string
  modelHash?: string
}

// 房间信息接口
export interface RoomInfo {
  id: string
  name: string
  onlineNumber:number
  createdAt:Date
  config:Omit<RoomConfig, 'modelHash'>
}

export interface RoomCheck{
  exists:boolean
}

// 创建房间响应
export interface CreateRoomResponse {
  room: RoomInfo
}

// 房间列表响应
export interface RoomListResponse {
  rooms: RoomInfo[]
  total: number
}

/**
 * 创建房间
 */
// export const createRoom = async (config: RoomConfig): Promise<ApiResponse<CreateRoomResponse>> => {
//   try {
//     const response = await post<ApiResponse<CreateRoomResponse>>('/api/rooms', config)
//     return response
//   } catch (error: any) {
//     return {
//       success: false,
//       error: error.message || '创建房间失败',
//       data: undefined,
//       message: error.message || '创建房间失败',
//     }
//   }
// }

/**
 * 获取房间列表
 */
export const getRoomList = async (): Promise<ApiResponse<RoomListResponse>> => {
  try {
    const response = await get<ApiResponse<RoomListResponse>>('/rooms')
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取房间列表失败',
      data: undefined,
      message: error.message || '创建房间失败',
    }
  }
}

/**
 * 获取房间详情
 */
export const getRoomDetail = async (roomId: string): Promise<ApiResponse<RoomInfo>> => {
  try {
    const response = await get<ApiResponse<RoomInfo>>(`/api/rooms/${roomId}`)
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取房间详情失败',
      data: undefined,
      message: error.message || '创建房间失败',
    }
  }
}
/**
 * 
 * 检测指定房间是否存在
 */
export const checkRoomExists = async (roomId:string):Promise<ApiResponse<RoomCheck>>=>{
  try {
    return await get<ApiResponse<RoomCheck>>(`/rooms/${roomId}/exists`)
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '检查失败',
      data: undefined,
      message: error.message || '检查失败',
    }
  }
}

/**
 * 删除房间
 */
export const deleteRoom = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const response = await del<ApiResponse<null>>(`/api/rooms/${roomId}`)
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '删除房间失败',
      data: undefined,
      message: error.message || '创建房间失败',
    }
  }
}

/**
 * 加入房间
 */
export const joinRoom = async (roomId: string, pinCode?: string): Promise<ApiResponse<RoomInfo>> => {
  try {
    const response = await post<ApiResponse<RoomInfo>>(`/api/rooms/${roomId}/join`, {
      pinCode
    })
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '加入房间失败',
      data: undefined,
      message: error.message || '创建房间失败',
    }
  }
}

/**
 * 离开房间
 */
export const leaveRoom = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const response = await post<ApiResponse<null>>(`/api/rooms/${roomId}/leave`)
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '离开房间失败',
      data: undefined,
      message: error.message || '创建房间失败',
    }
  }
}
