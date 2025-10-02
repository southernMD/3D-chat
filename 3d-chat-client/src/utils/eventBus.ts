// import { ref } from 'vue' // 暂时不需要

// 事件总线类型定义
export interface EventBusEvents {
  'egg-broadcast': EggBroadcastData
  'egg-cleared': EggClearedData
  'egg-clear': EggClearData
  'clear-egg-server': ClearEggServerData
  'reinsert-egg': ReinsertEggData
  'egg-collected': EggCollectedData
  'clear-egg-mapUserPositionDistance': ClearEggDistanceMapData
  // 装备相关事件
  'user-equipment-updated': UserEquipmentUpdatedData
  'egg-quantity-updated': EggQuantityUpdatedData
  // 用户模型相关事件
  'user-joined': UserJoinedData
  'user-left': UserLeftData
  'room-users-sync': RoomUsersSyncData
  // 模型状态更新事件
  'model-state-update': ModelStateUpdateData
  // 门状态同步事件
  'door-state-update': DoorStateUpdateData
  'door-state-sync': DoorStateUpdateData
  // 用户胶囊体更新事件
  'static-user-capsule-update': UserCapsuleUpdateData
  'user-capsule-remove': UserCapsuleRemoveData

  //向指定用户发送弹窗信息
  'send-popup-message':UserPopupMessageData
}

export interface EggBroadcastData {
  eggs: Array<{
    id: string
    x: number
    y: number
    z: number
  }>
  roomId: string
  totalEggs: number
  remainingEggs: number
}

export interface EggClearedData {
  eggId: string
  clearedBy: string
  timestamp: Date
  remainingEggs: number
}

export interface EggClearData {
  eggId: string
}

export interface ClearEggServerData {
  eggId: string
  // username: string
  // roomId: string
}

export interface ReinsertEggData {
  eggId: string
  reason: string
  message: string
  position: { id: string, x: number, y: number, z: number } | null
}

export interface EggCollectedData {
  eggId: string
  playerId: number
  username: string
  timestamp: Date
  message: string
}

export interface ClearEggDistanceMapData {
  eggId: string
}

// 装备相关接口
export interface UserEquipmentUpdatedData {
  egg: number
}

export interface EggQuantityUpdatedData {
  quantity: number
}

// 用户模型相关接口
export interface UserJoinedData {
  peerId: string
  userName: string
  modelHash: string
}

export interface UserLeftData {
  peerId: string
}

export interface RoomUsersSyncData {
  users: Array<{
    peerId: string
    userName: string
    modelHash: string
  }>
}

// 模型状态更新接口
export interface ModelStateUpdateData {
  userName: string
  modelState:{
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    animation: {
      currentAnimation: string
      walkActionActive: boolean
      standActionActive: boolean
      isWalking?: boolean
    }
    modelInfo?: {
      dimensions: { width: number; height: number; depth: number }
      hasAnimations: boolean
    }
    physics?: {
      isOnGround: boolean
      velocity: { x: number; y: number; z: number }
    }
  }
}

// 门状态同步接口
export interface DoorStateUpdateData {
  doorName: string
  doorNearName: string | undefined
  visible: boolean
  isOpen: boolean
}

// 用户胶囊体相关接口
export interface UserCapsuleUpdateData {
  userId: string
  position: { x: number; y: number; z: number }
  capsuleInfo?: { radius: number; height: number } // 添加胶囊体信息
}

export interface UserCapsuleRemoveData {
  userId: string
}

// 鸡蛋发射数据接口（本地发射，需要转发给其他客户端）
export interface EggShootData {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  mouseX: number
  mouseY: number
}

// 其他客户端鸡蛋发射数据接口（接收到的其他客户端发射的鸡蛋）
export interface EggShootOtherData {
  userName: string
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
}

export interface UserPopupMessageData{
  peerId:string
  message:string
}

// 事件总线实现
class EventBus {
  private events: Map<string, Function[]> = new Map()
  private messageCache: Map<string, any> = new Map() // 消息缓存

  // 监听事件
  on<K extends keyof EventBusEvents>(event: K, callback: (data: EventBusEvents[K]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)

    // 检查是否有缓存的消息，如果有则立即触发
    if (this.messageCache.has(event)) {
      const cachedData = this.messageCache.get(event)
      console.log(`🔄 EventBus: 发现缓存消息 ${event}，立即触发`)
      callback(cachedData)
      // 触发后清除缓存
      this.messageCache.delete(event)
    }
  }

  // 移除事件监听
  off<K extends keyof EventBusEvents>(event: K, callback: (data: EventBusEvents[K]) => void): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // 触发事件
  emit<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]): void {
    const callbacks = this.events.get(event)
    if (callbacks && callbacks.length > 0) {
      // 有监听器，直接触发
      callbacks.forEach(callback => callback(data))
      if(event !== 'model-state-update')console.log(`📡 EventBus: 事件 ${event} 已触发，监听器数量: ${callbacks.length}`)
    } else {
      // 没有监听器，缓存消息
      this.messageCache.set(event, data)
      console.log(`💾 EventBus: 事件 ${event} 无监听器，已缓存`)
    }
  }

  // 主动请求最近一次状态
  getLatestState<K extends keyof EventBusEvents>(event: K): EventBusEvents[K] | null {
    const cachedData = this.messageCache.get(event)
    if (cachedData) {
      console.log(`🔍 EventBus: 获取缓存状态 ${event}`)
      return cachedData
    }
    return null
  }

  // 清除指定事件的缓存
  clearCache<K extends keyof EventBusEvents>(event: K): void {
    if (this.messageCache.has(event)) {
      this.messageCache.delete(event)
      console.log(`🗑️ EventBus: 已清除事件 ${event} 的缓存`)
    }
  }

  // 清除所有事件监听和缓存
  clear(): void {
    this.events.clear()
    this.messageCache.clear()
    console.log(`🧹 EventBus: 已清除所有事件监听器和缓存`)
  }

  // 获取缓存状态（调试用）
  getCacheInfo(): { [key: string]: any } {
    const cacheInfo: { [key: string]: any } = {}
    this.messageCache.forEach((value, key) => {
      cacheInfo[key] = value
    })
    return cacheInfo
  }
}

// 导出单例事件总线
export const eventBus = new EventBus()