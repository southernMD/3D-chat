import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { WebRTCManager, type ConnectionStatus, type RoomInfo, type Peer, type RoomConfig, type ModelStateData } from '@/utils/webrtc'
import { showError, showSuccess, showInfo } from '@/utils/message'
import { useAuthStore } from '@/stores/auth'
import type { EggPosintions } from '@/types/types'
import { eventBus } from '@/utils/eventBus'

// 消息接口
export interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: number
  isOwn: boolean
  isSystem?: boolean  // 是否为系统消息
  peerId?: string
}

// 房间配置接口 (使用WebRTC模块的定义)
export type { RoomConfig } from '@/utils/webrtc'

export const useWebRTCStore = defineStore('webrtc', () => {
  // 获取auth store
  const authStore = useAuthStore()

  // 状态 - WebRTCManager不需要响应式，因为它包含复杂的mediasoup对象
  let webrtcManager: WebRTCManager | null = null
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const roomInfo = ref<RoomInfo | null>(null)
  const roomConfig = ref<RoomConfig | null>(null)
  const peers = ref<Peer[]>([])
  const messages = ref<ChatMessage[]>([])
  const isInitialized = ref(false)
  const currentRoomConfig = ref<RoomConfig | null>(null)
  const currentModelHash = ref<string | null>(null)
  const currentModelInfo = ref<any>(null)

  // 计算属性
  const isConnected = computed(() => connectionStatus.value === 'connected')
  const isInRoom = computed(() => !!roomInfo.value?.roomId)
  const onlineCount = computed(() => peers.value.length + (isInRoom.value ? 1 : 0))

  // 获取Socket实例
  const getSocket = () => {
    return webrtcManager?.getSocket() || null
  }

  // 装备相关函数
  const getUserEquipment = () => {
    if (!webrtcManager || !isConnected.value || !roomInfo.value) {
      console.warn('⚠️ WebRTC未连接或房间信息不存在，无法获取用户装备')
      return
    }

    console.log('📦 请求获取用户装备...')
    const socket = webrtcManager.getSocket()
    socket?.emit('getUserEquipment', {
      roomId: roomInfo.value.roomId,
      peerId: roomInfo.value.peerId
    })
  }

  const modifyEggQuantity = (change: number) => {
    if (!webrtcManager || !isConnected.value || !roomInfo.value) {
      console.warn('⚠️ WebRTC未连接或房间信息不存在，无法修改鸡蛋数量')
      return
    }

    if (change > 0) {
      console.log(`➕ 增加鸡蛋: +${change}`)
    } else if (change < 0) {
      console.log(`➖ 减少鸡蛋: ${change}`)
    } else {
      console.log(`🔄 鸡蛋数量不变: ${change}`)
    }

    const socket = webrtcManager.getSocket()
    socket?.emit('modifyEggQuantity', {
      roomId: roomInfo.value.roomId,
      peerId: roomInfo.value.peerId,
      change: change
    })
  }



  const addMessage = (content: string, isSent: boolean, senderName?: string) => {
    // 检查是否为系统消息
    const isSystemMessage = senderName === '系统'
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      sender: isSent ? (authStore.user?.username || '我') : (senderName || '其他用户'),
      content: content,
      timestamp: Date.now(),
      isOwn: isSent,
      isSystem: isSystemMessage,
      peerId: isSent ? roomInfo.value?.peerId : undefined
    }

    messages.value.push(newMessage)

    // 限制消息数量，避免内存泄漏
    if (messages.value.length > 1000) {
      messages.value = messages.value.slice(-500)
    }
  }



  // 初始化WebRTC管理器
  const initializeWebRTCManager = () => {
    if (webrtcManager) {
      console.warn('WebRTC管理器已经初始化')
      return
    }

    // 使用简单的回调函数，避免响应式引用
    webrtcManager = new WebRTCManager(
      (message: string) => {
        // console.log(`[WebRTC] ${message}`)
      },
      (status: ConnectionStatus, details?: string) => {
        connectionStatus.value = status
        console.log(`连接状态: ${status}`, details)
      },
      (info: RoomInfo | null) => {
        roomInfo.value = info
        console.log('房间信息更新:', info)
      },
      (peersList: Peer[]) => {
        peers.value = peersList
        console.log('成员列表更新:', peersList)
      },
      (content: string, isSent: boolean, senderName?: string) => {
        addMessage(content, isSent, senderName)
      },
      (eggPositions: EggPosintions) => {
        addMessage(`啊哈哈鸡蛋来了,生成${eggPositions.totalEggs}个鸡蛋`, false, "系统")
        console.log(eggPositions, "啊哈哈鸡蛋来了");

        // 触发事件总线，通知外部组件处理鸡蛋插入
        eventBus.emit('egg-broadcast', {
          eggs: eggPositions.eggs,
          roomId: eggPositions.roomId,
          totalEggs: eggPositions.totalEggs,
          remainingEggs: eggPositions.remainingEggs
        })

      },
      (userName: string, modelState: ModelStateData['state'])=>{
        // console.log(`${userName}的数据信息`,modelState);
        // 通过事件总线发送模型状态更新事件
        eventBus.emit('model-state-update', {
          userName,
          modelState
        });
      }
    )

    // 设置房间配置回调
    webrtcManager.setRoomConfigCallback((config: RoomConfig) => {
      console.log('🔧 收到房间配置回调:', config)
      roomConfig.value = config
      console.log('🔧 roomConfig.value 已更新:', roomConfig.value)
    })
    console.log(roomInfo.value);
    isInitialized.value = true
    console.log('WebRTC管理器已初始化')
  }

  // 连接到服务器
  const connectToServer = async (): Promise<boolean> => {
    if (!webrtcManager) {
      initializeWebRTCManager()
    }

    try {
      console.log('开始连接到服务器...')
      await webrtcManager!.connectSocket()
      console.log('服务器连接成功！')
      return true
    } catch (error) {
      console.error('连接服务器失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      showError(`连接服务器失败: ${errorMessage}`)
      return false
    }
  }

  // 创建并加入房间
  const createAndJoinRoom = async (
    roomConfig: RoomConfig,
    modelHash: string,
    modelInfo: any,
    userName: string
  ): Promise<boolean> => {
    if (!webrtcManager) {
      showError('WebRTC管理器未初始化')
      return false
    }

    // 检查连接状态
    if (!webrtcManager.getIsConnected()) {
      showError('未连接到服务器，请先建立连接')
      return false
    }

    try {
      console.log('开始创建房间...', { roomConfig, modelHash, userName })

      // 保存当前配置
      currentRoomConfig.value = roomConfig
      currentModelHash.value = modelHash
      currentModelInfo.value = modelInfo

      await webrtcManager.createOrJoinRoom(roomConfig, modelHash, userName)

      console.log('房间创建请求已发送')
      showSuccess('正在创建房间...')
      return true
    } catch (error) {
      console.error('创建房间失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      showError(`创建房间失败: ${errorMessage}`)
      return false
    }
  }

  // 检查房间是否存在
  const checkRoomExists = async (roomId: string): Promise<{ exists: boolean; roomInfo?: any; error?: string }> => {
    if (!webrtcManager) {
      throw new Error('WebRTC管理器未初始化')
    }

    try {
      const result = await webrtcManager.checkRoomExists(roomId)
      return result
    } catch (error) {
      console.error('检查房间失败:', error)
      return { exists: false, error: error instanceof Error ? error.message : '检查房间失败' }
    }
  }

  // 通过房间UUID加入房间
  const joinRoomByUUID = async (
    roomUUID: string,
    modelHash: string,
    modelInfo: any,
    userName: string
  ): Promise<boolean> => {
    if (!webrtcManager) {
      showError('WebRTC管理器未初始化')
      return false
    }

    // 检查连接状态
    if (!webrtcManager.getIsConnected()) {
      showError('未连接到服务器，请先建立连接')
      return false
    }

    try {
      console.log('正在通过房间UUID加入房间...')

      // 保存当前配置
      currentModelHash.value = modelHash
      currentModelInfo.value = modelInfo

      await webrtcManager.joinRoomByUUID(roomUUID, modelHash, userName)

      console.log('加入房间请求已发送')
      showSuccess('正在加入房间...')
      return true
    } catch (error) {
      console.error('加入房间失败:', error)

      // 检查是否是房间不存在的错误
      if (error instanceof Error && error.message.includes('房间不存在')) {
        showError('房间不存在或已被删除，请检查房间码是否正确')
      } else {
        showError('加入房间失败，请重试')
      }
      return false
    }
  }

  // 发送消息
  const sendMessage = (message: string): boolean => {
    if (!webrtcManager) {
      showError('WebRTC管理器未初始化')
      return false
    }

    if (!isConnected.value) {
      showError('未连接到服务器')
      return false
    }

    try {
      webrtcManager.sendMessage(message)
      return true
    } catch (error) {
      console.error('发送消息失败:', error)
      showError('发送消息失败')
      return false
    }
  }

  // 切换麦克风状态
  const toggleMicrophone = async (): Promise<boolean> => {
    if (!webrtcManager) {
      showError('WebRTC管理器未初始化')
      return false
    }

    if (!isConnected.value || !isInRoom.value) {
      showError('请先加入房间')
      return false
    }

    try {
      const enabled = await webrtcManager.toggleMicrophone()
      if (enabled) {
        showSuccess('麦克风已开启')
      } else {
        showInfo('麦克风已关闭')
      }
      return enabled
    } catch (error) {
      console.error('切换麦克风失败:', error)
      showError('切换麦克风失败')
      return false
    }
  }

  // 离开房间
  const leaveRoom = () => {
    if (webrtcManager) {
      webrtcManager.leaveRoom()
    }

    // 清理状态
    roomInfo.value = null
    peers.value = []
    currentRoomConfig.value = null
    currentModelHash.value = null
    currentModelInfo.value = null
  }

  // 断开连接
  const disconnect = () => {
    if (webrtcManager) {
      webrtcManager.disconnect()
    }

    // 重置所有状态
    connectionStatus.value = 'disconnected'
    roomInfo.value = null
    peers.value = []
    messages.value = []
    currentRoomConfig.value = null
    currentModelHash.value = null
    currentModelInfo.value = null
  }

  // 清理资源
  const cleanup = () => {
    disconnect()
    webrtcManager = null
    isInitialized.value = false
  }

  // 获取状态信息
  const getStatusInfo = () => {
    return {
      isConnected: isConnected.value,
      isInRoom: isInRoom.value,
      connectionStatus: connectionStatus.value,
      roomInfo: roomInfo.value,
      onlineCount: onlineCount.value,
      currentRoomConfig: currentRoomConfig.value,
      currentModelHash: currentModelHash.value,
      currentModelInfo: currentModelInfo.value
    }
  }

  // 清除鸡蛋标记
  const clearEgg = (eggId: string, id:string,username: string, roomId: string) => {
    if (!webrtcManager) {
      console.warn('⚠️ WebRTC管理器未初始化，无法清除鸡蛋标记')
      return false
    }

    try {
      webrtcManager.clearEgg(eggId, id,username, roomId)
      return true
    } catch (error) {
      console.error('❌ 清除鸡蛋标记失败:', error)
      return false
    }
  }

  const getYouPeer = ():Peer =>{
    return {
      id: webrtcManager!.getState().peerId!,
      name: authStore.user?.username!
    }
  }

  const sendYouState = (
    getModelStateFunction: () => ModelStateData['state'] | null,
    updateRate: number = 60
  ):void =>{
    console.log(getModelStateFunction());
    webrtcManager?.startModelStateTransmission(getModelStateFunction,updateRate)
  }

  // 🚪 发送门状态数据
  const sendDoorState = (doorName: string, doorNearName: string | undefined, visible: boolean, isOpen: boolean): boolean => {
    if (!webrtcManager) {
      console.error('WebRTC管理器未初始化')
      return false
    }

    if (!isConnected.value) {
      console.error('未连接到服务器')
      return false
    }

    try {
      webrtcManager.sendDoorState(doorName, doorNearName, visible, isOpen)
      return true
    } catch (error) {
      console.error('发送门状态失败:', error)
      return false
    }
  }

  // 🚪 设置门状态回调
  const setDoorStateCallback = (callback: (doorName: string, doorNearName: string | undefined, visible: boolean, isOpen: boolean) => void): void => {
    if (!webrtcManager) {
      console.error('WebRTC管理器未初始化')
      return
    }

    webrtcManager.setDoorStateCallback(callback)
  }

  // 🥚 发送鸡蛋发射数据
  const sendEggShoot = (position: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }): boolean => {
    if (!webrtcManager) {
      console.error('WebRTC管理器未初始化')
      return false
    }

    if (!isConnected.value) {
      console.error('未连接到服务器')
      return false
    }

    try {
      webrtcManager.sendEggShoot(position, velocity)
      return true
    } catch (error) {
      console.error('发送鸡蛋发射数据失败:', error)
      return false
    }
  }

  // 🥚 设置鸡蛋发射回调
  const setEggShootCallback = (callback: (userName: string, position: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }) => void): void => {
    if (!webrtcManager) {
      console.error('WebRTC管理器未初始化')
      return
    }

    webrtcManager.setEggShootCallback(callback)
  }



  return {
    // 状态
    connectionStatus,
    roomInfo,
    peers,
    messages,
    isInitialized,
    currentRoomConfig,
    currentModelHash,
    currentModelInfo,
    roomConfig,

    // 计算属性
    isConnected,
    isInRoom,
    onlineCount,

    // 方法
    initializeWebRTCManager,
    connectToServer,
    createAndJoinRoom,
    checkRoomExists,
    joinRoomByUUID,
    sendMessage,
    toggleMicrophone,
    leaveRoom,
    disconnect,
    cleanup,
    getStatusInfo,
    clearEgg,
    getYouPeer,
    getSocket,
    // 装备相关方法
    getUserEquipment,
    modifyEggQuantity,

    sendYouState,
    // 🚪 门状态相关方法
    sendDoorState,
    setDoorStateCallback,
    // 🥚 鸡蛋发射相关方法
    sendEggShoot,
    setEggShootCallback
  }
})
