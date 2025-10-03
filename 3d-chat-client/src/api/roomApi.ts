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

// 检查房间是否存在密码
export interface RoomPasswordExists {
  exists: boolean
}

// 验证房间密码是否正确
export interface RoomPasswordVerify {
  isRight: boolean
}

// 房间人数状态
export interface RoomCapacityStatus {
  full: boolean
  onlineNumber: number
  maxUsers: number
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
 * 检查房间是否设置了密码
 */
export const checkRoomHasPassword = async (roomId: string): Promise<ApiResponse<RoomPasswordExists>> => {
  try {
    const response = await get<ApiResponse<RoomPasswordExists>>(`/rooms/${roomId}/password`)
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '检测房间密码失败',
      data: undefined,
      message: error.message || '检测房间密码失败',
    }
  }
}

/**
 * 检查房间人数是否已满
 */
export const checkRoomIsFull = async (roomId: string): Promise<ApiResponse<RoomCapacityStatus>> => {
  try {
    const response = await get<ApiResponse<RoomCapacityStatus>>(`/rooms/${roomId}/full`)
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '检测房间人数是否已满失败',
      data: undefined,
      message: error.message || '检测房间人数是否已满失败',
    }
  }
}

/**
 * 校验房间密码是否正确
 */
export const verifyRoomPassword = async (
  roomId: string,
  password: string
): Promise<ApiResponse<RoomPasswordVerify>> => {
  try {
    const response = await post<ApiResponse<RoomPasswordVerify>>(`/rooms/${roomId}/password/verify`, { password })
    return response
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '验证房间密码失败',
      data: undefined,
      message: error.message || '验证房间密码失败',
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
