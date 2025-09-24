import { ref } from 'vue'

// 事件总线类型定义
export interface EventBusEvents {
  'egg-broadcast': EggBroadcastData
  'egg-cleared': EggClearedData
  'egg-clear': EggClearData
  'clear-egg-server': ClearEggServerData
  'reinsert-egg': ReinsertEggData
  'egg-collected': EggCollectedData
  'clear-egg-mapUserPositionDistance': ClearEggDistanceMapData
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

// 事件总线实现
class EventBus {
  private events: Map<string, Function[]> = new Map()

  // 监听事件
  on<K extends keyof EventBusEvents>(event: K, callback: (data: EventBusEvents[K]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
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
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // 清除所有事件监听
  clear(): void {
    this.events.clear()
  }
}

// 导出单例事件总线
export const eventBus = new EventBus()
