import { Device } from 'mediasoup-client'
import { io, Socket } from 'socket.io-client'
import type { types as mediasoupTypes } from 'mediasoup-client'
import type { EggPosintions } from '@/types/types'
import { eventBus } from '@/utils/eventBus'

// 连接状态类型
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// 房间信息接口
export interface RoomInfo {
  roomId: string
  peerId: string
}

// 成员信息接口
export interface Peer {
  id: string
  name: string
  modelHash?: string // 用户的模型hash
}

// 房间配置接口
export interface RoomConfig {
  name: string
  description: string
  maxUsers: string
  isPrivate: boolean
  enableVoice: boolean
  enableText: boolean
  map: string
}

// Socket.IO响应接口
interface RouterRtpCapabilitiesResponse {
  rtpCapabilities?: any
  error?: string
}

interface TransportResponse {
  id?: string
  iceParameters?: any
  iceCandidates?: any
  dtlsParameters?: any
  sctpParameters?: any
  error?: string
}

interface ConnectTransportResponse {
  connected?: boolean
  error?: string
}

interface ProduceDataResponse {
  id?: string
  label?: string
  protocol?: string
  error?: string
  streamId?: number
}

interface ProduceResponse {
  id?: string
  error?: string
}

interface ConsumeResponse {
  id?: string
  kind?: string
  rtpParameters?: any
  producerPeerId?: string
  error?: string
}

interface GetProducersResponse {
  producers?: Array<{
    producerId: string
    producerPeerId: string
    kind?: string
    type?: 'media' | 'data'
  }>
  error?: string
}

// 模型状态数据接口
export interface ModelStateData {
  type: 'modelState'
  peerId: string
  timestamp: number
  state: {
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
    moveSpeed:number
  }
}

// 门状态同步数据接口
export interface DoorStateData {
  type: 'doorState'
  peerId: string
  timestamp: number
  doorName: string
  doorNearName: string | undefined
  visible: boolean
  isOpen: boolean
}

// 鸡蛋发射数据接口
export interface EggShootData {
  type: 'eggShoot'
  peerId: string
  timestamp: number
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
}

// 数据通道消息类型
export type DataChannelMessage = {
  type: 'chat'
  message: string
  peerId: string
  timestamp: number
} | ModelStateData | DoorStateData | EggShootData | PopupData

export interface PopupData {
  type: 'popup'
  peerId: string
  timestamp: number
  message:string
  toPeerId:string
}

// 应用程序状态接口
export interface AppState {
  socket: Socket | null
  device: Device | null
  rtpCapabilities: any;
  producerTransport: mediasoupTypes.Transport | null
  consumerTransport: mediasoupTypes.Transport | null
  dataProducer: mediasoupTypes.DataProducer | null
  dataConsumers: Map<string, { dataConsumer: mediasoupTypes.DataConsumer; producerPeerId: string }>
  audioProducer: mediasoupTypes.Producer | null
  audioConsumers: Map<string, { consumer: mediasoupTypes.Consumer; producerPeerId: string }>
  microphoneEnabled: boolean
  roomId: string | null
  peerId: string | null
  serverUrl: string | null
  roomConfig: RoomConfig | null
}

// 日志回调类型
type LogCallback = (message: string) => void
type ConnectionStatusCallback = (status: ConnectionStatus, message?: string) => void
type RoomInfoCallback = (info: RoomInfo) => void
type PeersListCallback = (peers: Peer[]) => void
type MessageCallback = (content: string, isSent: boolean, senderName?: string) => void
type EggPositionsCallback = (positions: EggPosintions) => void | undefined
type ModelStateCallback = (userName: string, modelState: ModelStateData['state']) => void
type DoorStateCallback = (doorName: string, doorNearName: string | undefined, visible: boolean, isOpen: boolean) => void
type EggShootCallback = (userName: string, position: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }) => void
type PopupMessageCallback = (message:string) => void
export class WebRTCManager {
  private state: AppState = {
    socket: null,
    device: null,
    rtpCapabilities: null,
    producerTransport: null,
    consumerTransport: null,
    dataProducer: null,
    dataConsumers: new Map(),
    audioProducer: null,
    audioConsumers: new Map(),
    microphoneEnabled: false,
    roomId: null,
    peerId: null,
    serverUrl: null,
    roomConfig: null
  }

  // 维护成员列表和名字映射
  private peers: Peer[] = []
  private peerNames: Map<string, string> = new Map() // peerId -> name

  private logCallback: LogCallback
  private updateConnectionStatusCallback: ConnectionStatusCallback
  private updateRoomInfoCallback: RoomInfoCallback
  private updatePeersListCallback: PeersListCallback
  private addMessageCallback: MessageCallback
  private getEggPositionsCallback: EggPositionsCallback | undefined
  private updateRoomConfigCallback?: (config: RoomConfig) => void
  private modelStateCallback?: ModelStateCallback
  private doorStateCallback?: DoorStateCallback
  private eggShootCallback?: EggShootCallback
  private popupMessageCallback?: PopupMessageCallback
  

  // 模型状态传输相关
  private modelStateInterval?: number
  private lastModelStateTime: number = 0
  private modelStateUpdateRate: number = 60 // 每秒60次更新

  constructor(
    logCallback: LogCallback,
    updateConnectionStatusCallback: ConnectionStatusCallback,
    updateRoomInfoCallback: RoomInfoCallback,
    updatePeersListCallback: PeersListCallback,
    addMessageCallback: MessageCallback,
    getEggPositionsCallback?: EggPositionsCallback,
    modelStateCallback?: ModelStateCallback
  ) {
    this.logCallback = logCallback
    this.updateConnectionStatusCallback = updateConnectionStatusCallback
    this.updateRoomInfoCallback = updateRoomInfoCallback
    this.updatePeersListCallback = updatePeersListCallback
    this.addMessageCallback = addMessageCallback
    this.getEggPositionsCallback = getEggPositionsCallback
    this.modelStateCallback = modelStateCallback
  }

  private log(message: string): void {
    // console.log(`[WebRTC] ${message}`)
    this.logCallback(message)
  }

  /**
   * 获取连接状态
   */
  public getIsConnected(): boolean {
    return this.state.socket?.connected || false
  }

  /**
   * 获取Socket实例
   */
  public getSocket() {
    return this.state.socket
  }

  /**
   * 连接到Socket.IO服务器
   */
  public async connectSocket(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // 获取环境变量
        const host = import.meta.env.VITE_APP_HOST || 'localhost'
        const port = import.meta.env.VITE_APP_HOST_PORT || '3000'
        const wsProtocol = import.meta.env.VITE_WS_PROTOCOL

        // 检测当前环境是HTTP还是HTTPS
        const protocol = window.location.protocol
        const isSecure = protocol === 'https:'

        // 根据环境选择WebSocket连接方式
        let serverUrl: string
        if (wsProtocol) {
          serverUrl = `${wsProtocol}://${host}:${port}`
        } else {
          serverUrl = isSecure
            ? `wss://${host}:${port}`
            : `ws://${host}:${port}`
        }

        this.log(`正在连接到服务器：${serverUrl}`)
        this.updateConnectionStatusCallback('connecting')

        // 保存服务器URL用于HTTP请求
        this.state.serverUrl = serverUrl.replace(/^ws/, 'http')

        this.state.socket = io(serverUrl, {
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000
        })

        // 设置连接事件处理
        this.setupSocketEvents(resolve, reject)

        // 设置连接超时
        const timeoutId = setTimeout(() => {
          reject(new Error('连接超时'))
        }, 15000)

        // 连接成功后清除超时
        this.state.socket.on('connect', () => {
          clearTimeout(timeoutId)
        })

      } catch (error) {
        this.log(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
        this.updateConnectionStatusCallback('disconnected', '连接失败')
        reject(error)
      }
    })
  }

  /**
   * 用户认证
   */
  private authenticateUser(): void {
    if (!this.state.socket) return

    // 获取认证token
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')

    if (token) {
      this.log('🔐 发送用户认证信息...')
      this.state.socket.emit('authenticate', { token })
    } else {
      this.log('⚠️ 未找到认证token，跳过用户认证')
    }
  }

  /**
   * 设置装备相关的Socket监听
   */
  private setupEquipmentSocketListeners(): void {
    if (!this.state.socket) return

    // 监听用户装备数据
    this.state.socket.on('userEquipment', (data: { success: boolean, data?: any, message?: string }) => {
      if (data.success && data.data) {
        console.log(`📦 收到用户装备数据: 鸡蛋 x${data.data.egg || 0}`)
        eventBus.emit('user-equipment-updated', { egg: data.data.egg || 0 })
      } else {
        console.error('❌ 获取用户装备失败:', data.message)
      }
    })

    // 监听鸡蛋数量变化结果
    this.state.socket.on('eggQuantityChanged', (data: { success: boolean, quantity?: number, message: string }) => {
      if (data.success && data.quantity !== undefined) {
        console.log(`✅ 鸡蛋数量修改成功: ${data.quantity}`)
        eventBus.emit('egg-quantity-updated', { quantity: data.quantity })
      } else {
        console.error('❌ 鸡蛋数量修改失败:', data.message)
      }
    })
  }

  /**
   * 设置Socket事件监听
   */
  private setupSocketEvents(resolve?: () => void, reject?: (error: Error) => void): void {
    if (!this.state.socket) return

    // 监听服务器连接事件
    this.state.socket.on('connect', () => {
      this.log('已连接到Socket.IO服务器')
      this.updateConnectionStatusCallback('connected', '已连接到服务器')

      // 连接成功后进行用户认证
      this.authenticateUser()

      // 如果有resolve回调，说明是在等待连接建立
      if (resolve) {
        resolve()
      }
    })

    // 监听连接错误事件
    this.state.socket.on('connect_error', (error: Error) => {
      this.log(`连接错误: ${error.message}`)
      this.updateConnectionStatusCallback('disconnected', `连接错误: ${error.message}`)

      // 如果有reject回调，说明是在等待连接建立
      if (reject) {
        reject(error)
      }
    })

    // 监听服务器断开连接事件
    this.state.socket.on('disconnect', () => {
      this.log('与Socket.IO服务器断开连接')
      this.updateConnectionStatusCallback('disconnected', '与服务器断开连接')
      this.cleanupResources()
    })

    // 监听认证结果
    this.state.socket.on('authenticated', (data: { success: boolean, userId?: number, message: string }) => {
      if (data.success) {
        this.log(`🔐 用户认证成功: userId=${data.userId}`)
      } else {
        this.log(`❌ 用户认证失败: ${data.message}`)
      }
    })

    // 监听服务器错误事件
    this.state.socket.on('error', ({ message, code, details }) => {
      this.log(`服务器错误: ${message}`)

      if (code === 'ROOM_NOT_FOUND') {
        this.updateConnectionStatusCallback('error', details || '房间不存在')
        // 可以在这里触发特定的错误处理回调
        throw new Error(details || '房间不存在')
      } else {
        this.updateConnectionStatusCallback('error', message)
        throw new Error(message)
      }
    })

    // 监听加入房间成功事件
    this.state.socket.on('joined', async ({ roomId, peerId, peers, roomConfig, modelHash }) => {
      this.log(`成功加入房间: ${roomId}, 您的ID是: ${peerId}`)

      // 更新状态
      this.state.roomId = roomId
      this.state.peerId = peerId
      this.state.roomConfig = roomConfig

      // 初始化成员列表
      this.peers = peers || []
      this.peerNames.clear()
      for (const peer of this.peers) {
        this.peerNames.set(peer.id, peer.name)
      }

      // 更新UI
      this.updateConnectionStatusCallback('connected', '已加入房间')
      this.updateRoomInfoCallback({ roomId, peerId })

      // 确保roomConfig被设置
      this.state.roomConfig = roomConfig
      this.updateRoomConfigCallback?.(roomConfig)

      this.updatePeersListCallback([...this.peers])

      // 🆕 通过 eventBus 通知页面同步房间内已存在的用户
      const existingUsers = this.peers.map(peer => ({
        peerId: peer.id,
        userName: peer.name,
        modelHash: peer.modelHash || 'default-model-hash'
      }))

      if (existingUsers.length > 0) {
        eventBus.emit('room-users-sync', {
          users: existingUsers
        })
      }

      if(roomConfig.map === 'school'){
        this.state.socket!.on('eggBroadcast', (data:EggPosintions) => {
          console.log(`收到${data}个鸡蛋位置`);
          this.getEggPositionsCallback?.(data);
        });

        // 监听重新插入鸡蛋事件
        this.state.socket!.on('reinsertEgg', (data: {
          eggId: string,
          reason: string,
          message: string,
          position: { id: string, x: number, y: number, z: number } | null
        }) => {
          console.log(`🥚 收到重新插入鸡蛋请求:`, data);
          // 通过事件总线传递到3DChatRoom.vue处理
          eventBus.emit('reinsert-egg', data);
        });

        // 监听鸡蛋收集成功事件
        this.state.socket!.on('eggCollected', (data: {
          eggId: string,
          playerId: number,
          username: string,
          timestamp: Date,
          message: string
        }) => {
          console.log(`🥚 鸡蛋收集成功:`, data);
          // 通过事件总线传递到3DChatRoom.vue处理
          eventBus.emit('egg-collected', data);
        });

        // 监听鸡蛋被清除事件（广播给房间内所有用户）
        this.state.socket!.on('eggCleared', (data: {
          eggId: string,
          clearedBy: string,
          timestamp: Date,
          remainingEggs: number
        }) => {
          console.log(`🥚 鸡蛋被清除:`, data);
          // 通过事件总线传递到3DChatRoom.vue处理
          eventBus.emit('egg-cleared', data);
        });
      }
      this.log(`房间配置: ${JSON.stringify(roomConfig)}`)
      this.log(`模型Hash: ${modelHash}`)

      // 设置装备相关的Socket监听
      this.setupEquipmentSocketListeners()

      // 初始化WebRTC连接
      await this.initializeWebRTC()
    })

    // 监听房间配置事件
    this.state.socket.on('roomConfig', (roomConfig: RoomConfig) => {
      this.log(`收到房间配置: ${JSON.stringify(roomConfig)}`)
      this.state.roomConfig = roomConfig
      this.updateRoomConfigCallback?.(roomConfig)
    })

    // 监听新成员加入事件
    this.state.socket.on('peerJoined', ({ peerId, userName, modelHash }) => {
      this.log(`新成员加入: ${userName} (${peerId}) 模型: ${modelHash}`)

      // 添加到成员列表
      const newPeer: Peer = {
        id: peerId,
        name: userName,
        modelHash: modelHash // 保存模型hash
      }

      // 更新内部成员列表
      this.peers.push(newPeer)
      this.peerNames.set(peerId, userName)

      // 发送系统通知消息
      this.addMessageCallback(`${userName} 加入了房间`, false, '系统')

      // 更新UI
      this.updatePeersListCallback([...this.peers])

      // 🆕 通过 eventBus 通知页面有新用户加入
      eventBus.emit('user-joined', {
        peerId,
        userName,
        modelHash
      })
    })

    // 监听成员离开事件
    this.state.socket.on('peerLeft', ({ peerId }) => {
      this.log(`成员离开: ${peerId}`)

      // 从消费者列表中移除该成员的数据消费者
      for (const [dataProducerId, { producerPeerId, dataConsumer }] of this.state.dataConsumers) {
        if (producerPeerId === peerId) {
          dataConsumer.close()
          this.state.dataConsumers.delete(dataProducerId)
          this.log(`关闭了来自 ${peerId} 的数据消费者`)
        }
      }

      // 从音频消费者列表中移除该成员的音频消费者
      for (const [producerId, { producerPeerId, consumer }] of this.state.audioConsumers) {
        if (producerPeerId === peerId) {
          consumer.close()
          this.state.audioConsumers.delete(producerId)
          this.log(`关闭了来自 ${peerId} 的音频消费者`)

          // 移除对应的音频元素
          const audioElement = document.getElementById(`audio-${producerId}`) as HTMLAudioElement
          if (audioElement) {
            audioElement.remove()
          }
        }
      }

      // 从成员列表中移除该成员
      const leavingPeer = this.peers.find(peer => peer.id === peerId)
      const leavingPeerName = leavingPeer?.name || this.peerNames.get(peerId) || '未知用户'

      this.peers = this.peers.filter(peer => peer.id !== peerId)
      this.peerNames.delete(peerId)

      // 发送系统通知消息
      this.addMessageCallback(`${leavingPeerName} 离开了房间`, false, '系统')

      // 更新UI
      this.updatePeersListCallback([...this.peers])

      // 🆕 通过 eventBus 通知页面有用户离开
      eventBus.emit('user-left', {
        peerId
      })
    })

    // 监听新的数据生产者事件
    this.state.socket.on('newDataProducer', async ({ dataProducerId, producerPeerId, label, protocol }) => {
      this.log(`新的数据生产者: ${producerPeerId} (${label})`)

      // 检查是否已经有这个数据生产者的消费者
      if (this.state.dataConsumers.has(dataProducerId)) {
        this.log(`已经在消费数据生产者 ${dataProducerId}`)
        return
      }

      try {
        // 消费这个数据生产者
        await this.consumeData(dataProducerId, producerPeerId)
      } catch (error) {
        this.log(`消费数据生产者失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    })

    // 监听数据生产者关闭事件
    this.state.socket.on('dataProducerClosed', ({ dataProducerId, producerPeerId }) => {
      this.log(`数据生产者关闭: ${producerPeerId}`)

      const dataConsumerInfo = this.state.dataConsumers.get(dataProducerId)
      if (dataConsumerInfo) {
        dataConsumerInfo.dataConsumer.close()
        this.state.dataConsumers.delete(dataProducerId)
      }
    })

    // 监听新的音频生产者事件
    this.state.socket.on('newProducer', async ({ producerId, producerPeerId, kind }) => {
      this.log(`新的${kind}生产者: ${producerPeerId}`)

      // 只处理音频生产者
      if (kind === 'audio') {
        // 检查是否已经有这个生产者的消费者
        if (this.state.audioConsumers.has(producerId)) {
          this.log(`已经在消费音频生产者 ${producerId}`)
          return
        }

        try {
          // 消费这个音频生产者
          await this.consumeAudio(producerId, producerPeerId)
        } catch (error) {
          this.log(`消费音频生产者失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
    })

    // 监听音频生产者关闭事件
    this.state.socket.on('producerClosed', ({ producerId, producerPeerId }) => {
      this.log(`音频生产者关闭: ${producerPeerId}`)

      const audioConsumerInfo = this.state.audioConsumers.get(producerId)
      if (audioConsumerInfo) {
        audioConsumerInfo.consumer.close()
        this.state.audioConsumers.delete(producerId)

        // 移除对应的音频元素
        const audioElement = document.getElementById(`audio-${producerId}`) as HTMLAudioElement
        if (audioElement) {
          audioElement.remove()
        }
      }
    })

    // 监听错误事件
    this.state.socket.on('error', ({ message }) => {
      this.log(`服务器错误: ${message}`)
      this.updateConnectionStatusCallback('disconnected', `错误: ${message}`)
    })
  }

  /**
   * 初始化WebRTC
   */
  private async initializeWebRTC(): Promise<void> {
    try {
      this.log('初始化WebRTC连接...')

      // 1. 加载mediasoup设备
      this.state.device = new Device()

      // 2. 获取router的RTP能力
      const routerRtpCapabilities = await this.emitAsync<RouterRtpCapabilitiesResponse>(
        'getRouterRtpCapabilities',
        {}
      )

      if (!routerRtpCapabilities.rtpCapabilities) {
        throw new Error('无法获取RTP能力')
      }

      // 存储RTP能力
      this.state.rtpCapabilities = routerRtpCapabilities.rtpCapabilities
      this.log('获取到RTP能力')
      // 3. 加载设备
      await this.state.device.load({ routerRtpCapabilities: this.state.rtpCapabilities })
      this.log('mediasoup设备已加载')

      // 4. 创建生产者传输
      await this.createProducerTransport()

      // 5. 创建消费者传输
      await this.createConsumerTransport()

      // 6. 获取当前房间内的所有生产者
      await this.getExistingProducers()

      this.log('WebRTC连接初始化完成')
    } catch (error) {
      this.log(`WebRTC初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 创建生产者传输
   */
  private async createProducerTransport(): Promise<void> {
    if (!this.state.socket || !this.state.device || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数')
    }

    const producerTransportInfo = await this.emitAsync<TransportResponse>(
      'createWebRtcTransport',
      { roomId: this.state.roomId, peerId: this.state.peerId, consuming: false }
    )

    if (producerTransportInfo.error || !producerTransportInfo.id) {
      throw new Error(`创建生产者传输失败: ${producerTransportInfo.error || '未知错误'}`)
    }

    this.log('生产者传输已创建')

    this.state.producerTransport = this.state.device.createSendTransport({
      id: producerTransportInfo.id,
      iceParameters: producerTransportInfo.iceParameters,
      iceCandidates: producerTransportInfo.iceCandidates,
      dtlsParameters: producerTransportInfo.dtlsParameters,
      sctpParameters: producerTransportInfo.sctpParameters,
      iceServers:import.meta.env.DEV ? [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls:import.meta.env.VITE_TURN_URL,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_PASSWORD,
        }
      ] :
      [
        {
          urls:import.meta.env.VITE_TURN_URL,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_PASSWORD,
        }
      ]
    })

    // 处理生产者传输连接事件
    this.state.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        const result = await this.emitAsync<ConnectTransportResponse>(
          'connectWebRtcTransport',
          {
            roomId: this.state.roomId,
            peerId: this.state.peerId,
            transportId: this.state.producerTransport!.id,
            dtlsParameters,
            isConsumer: false
          }
        )

        if (result.error) {
          errback(new Error(result.error))
          return
        }

        callback()
        this.log('生产者传输已连接')
      } catch (error) {
        errback(error instanceof Error ? error : new Error('连接失败'))
        this.log(`生产者传输连接错误: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    })

    // 处理生产者传输生产数据事件
    this.state.producerTransport.on('producedata', async (parameters, callback, errback) => {
      const { sctpStreamParameters, label, protocol, appData } = parameters

      try {
        const result = await this.emitAsync<ProduceDataResponse>(
          'produceData',
          {
            roomId: this.state.roomId,
            peerId: this.state.peerId,
            label,
            protocol,
            appData,
            sctpStreamParameters
          }
        )

        if (result.error || !result.id) {
          errback(new Error(result.error || '创建数据生产者失败'))
          return
        }

        callback({ id: result.id })
        this.log(`数据生产者已创建，ID: ${result.id}`)
      } catch (error) {
        errback(error instanceof Error ? error : new Error('创建失败'))
        this.log(`数据生产失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    })

    // 处理生产者传输生产音频事件
    this.state.producerTransport.on('produce', async (parameters, callback, errback) => {
      const { kind, rtpParameters, appData } = parameters

      try {
        const result = await this.emitAsync<ProduceResponse>(
          'produce',
          {
            roomId: this.state.roomId,
            peerId: this.state.peerId,
            kind,
            rtpParameters,
            appData
          }
        )

        if (result.error || !result.id) {
          errback(new Error(result.error || '创建音频生产者失败'))
          return
        }

        callback({ id: result.id })
        this.log(`音频生产者已创建，ID: ${result.id}`)
      } catch (error) {
        errback(error instanceof Error ? error : new Error('创建失败'))
        this.log(`音频生产失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    })

    // 创建数据生产者
    this.state.dataProducer = await this.state.producerTransport.produceData({
      ordered: true,
      label: 'chat',
      protocol: 'simple-chat',
      appData: { peerId: this.state.peerId },
    })

    this.log(`数据生产者已准备就绪`)
  }

  /**
   * 创建或加入房间
   */
  public async createOrJoinRoom(roomConfig: RoomConfig, modelHash: string, userName: string): Promise<void> {
    if (!this.state.socket) {
      this.log('Socket连接未初始化')
      return
    }

    this.log('正在创建房间并加入...')

    // 发送创建房间请求，包含房间配置和模型信息
    this.state.socket.emit('createOrJoin', {
      roomConfig,
      modelHash,
      userName: userName
    })
  }



  /**
   * 创建消费者传输
   */
  private async createConsumerTransport(): Promise<void> {
    if (!this.state.socket || !this.state.roomId || !this.state.peerId) {
      throw new Error('Socket、房间ID或成员ID未初始化')
    }

    return new Promise((resolve, reject) => {
      this.state.socket!.emit('createWebRtcTransport', {
        roomId: this.state.roomId,
        peerId: this.state.peerId,
        consuming: true
      }, async (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }

        try {
          // 创建接收传输
          this.state.consumerTransport = this.state.device!.createRecvTransport({
            id: response.id,
            iceParameters: response.iceParameters,
            iceCandidates: response.iceCandidates,
            dtlsParameters: response.dtlsParameters,
            sctpParameters: response.sctpParameters,
            iceServers:import.meta.env.DEV ? [
              { urls: 'stun:stun.l.google.com:19302' },
              {
                urls:import.meta.env.VITE_TURN_URL,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_PASSWORD,
              }
            ] :
            [
              {
                urls:import.meta.env.VITE_TURN_URL,
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_PASSWORD,
              }
            ]
          })

          // 监听连接事件
          this.state.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              await this.connectTransport(this.state.roomId!, this.state.peerId!, response.id, dtlsParameters, true)
              callback()
            } catch (error) {
              errback(error instanceof Error ? error : new Error('连接失败'))
            }
          })

          this.log('消费者传输创建成功')
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  /**
   * 连接传输
   */
  private connectTransport(roomId: string, peerId: string, transportId: string, dtlsParameters: any, isConsumer: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.state.socket!.emit('connectWebRtcTransport', {
        roomId,
        peerId,
        transportId,
        dtlsParameters,
        isConsumer
      }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * 获取房间内现有的生产者
   */
  private async getExistingProducers(): Promise<void> {
    if (!this.state.socket || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数')
    }

    try {
      const { producers, error } = await this.emitAsync<GetProducersResponse>(
        'getProducers',
        { roomId: this.state.roomId, peerId: this.state.peerId }
      )

      if (error) {
        throw new Error(error)
      }

      if (!producers || producers.length === 0) {
        this.log('房间内暂无其他生产者')
        return
      }

      // 记录已经尝试消费的生产者ID，避免重复消费
      const attemptedProducerIds = new Set<string>()

      // 消费每个生产者
      for (const producer of producers) {
        const { producerId, producerPeerId, kind, type } = producer

        // 如果已经尝试过这个生产者，则跳过
        if (attemptedProducerIds.has(producerId)) {
          continue
        }

        // 标记为已尝试
        attemptedProducerIds.add(producerId)

        // 根据生产者类型主动判断并触发相应的消费
        if (type === 'data' || kind === 'data') {
          // 数据生产者
          if (!this.state.dataConsumers.has(producerId)) {
            try {
              await this.consumeData(producerId, producerPeerId)
              this.log(`成功消费数据生产者: ${producerId}`)
            } catch (error) {
              this.log(`消费数据生产者 ${producerId} 失败: ${error instanceof Error ? error.message : '未知错误'}`)
            }
          }
        } else if (type === 'media' && kind === 'audio') {
          // 音频生产者
          if (!this.state.audioConsumers.has(producerId)) {
            try {
              await this.consumeAudio(producerId, producerPeerId)
              this.log(`成功消费音频生产者: ${producerId}`)
            } catch (error) {
              this.log(`消费音频生产者 ${producerId} 失败: ${error instanceof Error ? error.message : '未知错误'}`)
            }
          }
        } else {
          // 未知类型或其他媒体类型（如视频）
          this.log(`跳过未支持的生产者类型: ${type}, kind: ${kind}, producerId: ${producerId}`)
        }
      }
    } catch (error) {
      this.log(`获取房间内现有生产者失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 清理资源
   */
  private cleanupResources(): void {
    // 停止模型状态传输
    this.stopModelStateTransmission()

    // 清理所有WebRTC资源
    this.state.roomId = null
    this.state.peerId = null
    this.state.rtpCapabilities = null

    if (this.state.producerTransport) {
      this.state.producerTransport.close()
      this.state.producerTransport = null
    }

    if (this.state.consumerTransport) {
      this.state.consumerTransport.close()
      this.state.consumerTransport = null
    }

    // 清理生产者和消费者
    this.state.dataProducer = null
    this.state.audioProducer = null
    this.state.dataConsumers.clear()
    this.state.audioConsumers.clear()

    // 清理成员列表
    this.peers = []
    this.peerNames.clear()
  }

  /**
   * 通过房间UUID加入房间
   */
  public async joinRoomByUUID(roomUUID: string, modelHash: string, userName: string): Promise<void> {
    if (!this.state.socket) {
      this.log('Socket连接未初始化')
      return
    }

    this.log(`正在通过房间UUID加入房间: ${roomUUID}`)

    // 发送加入房间请求，使用房间UUID作为roomId
    this.state.socket.emit('createOrJoin', {
      roomId: roomUUID,  // 直接使用UUID作为房间ID
      modelHash,
      userName: userName,
      roomConfig: null  // 加入现有房间不需要配置
    })
  }

  /**
   * 离开房间
   */
  public leaveRoom(): void {
    if (!this.state.socket || !this.state.roomId || !this.state.peerId) {
      return
    }
    
    this.log('正在离开房间...')
    this.state.socket.emit('leave', { 
      roomId: this.state.roomId, 
      peerId: this.state.peerId 
    })
    
    this.cleanupResources()
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.state.socket) {
      this.state.socket.disconnect()
      this.state.socket = null
    }
    this.cleanupResources()
  }

  /**
   * 发送聊天消息
   */
  public sendMessage(message: string): void {
    if (!this.state.dataProducer || !this.state.peerId) {
      this.log('数据生产者未初始化，无法发送消息')
      return
    }

    try {
      const chatMessage: DataChannelMessage = {
        type: 'chat',
        message,
        peerId: this.state.peerId,
        timestamp: Date.now()
      }

      const encodedMessage = new TextEncoder().encode(JSON.stringify(chatMessage))
      this.state.dataProducer.send(encodedMessage)
      this.log(`发送聊天消息: ${message}`)

      // 调用回调函数更新UI显示发送的消息
      this.addMessageCallback(message, true)
    } catch (error) {
      this.log(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 发送模型状态数据
   */
  public sendModelState(modelState: ModelStateData['state']): void {
    if (!this.state.dataProducer || !this.state.peerId) {
      this.log('数据生产者未初始化，无法发送模型状态')
      return
    }

    try {
      const modelStateMessage: ModelStateData = {
        type: 'modelState',
        peerId: this.state.peerId,
        timestamp: Date.now(),
        state: modelState
      }

      const encodedMessage = new TextEncoder().encode(JSON.stringify(modelStateMessage))
      this.state.dataProducer.send(encodedMessage)
      // 不记录日志，避免过多输出
    } catch (error) {
      this.log(`发送模型状态失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 🚪 发送门状态数据
   */
  public sendDoorState(doorName: string, doorNearName: string | undefined, visible: boolean, isOpen: boolean): void {
    if (!this.state.dataProducer || !this.state.peerId) {
      this.log('数据生产者未初始化，无法发送门状态')
      return
    }

    try {
      const doorStateMessage: DoorStateData = {
        type: 'doorState',
        peerId: this.state.peerId,
        timestamp: Date.now(),
        doorName,
        doorNearName,
        visible,
        isOpen
      }

      const encodedMessage = new TextEncoder().encode(JSON.stringify(doorStateMessage))
      this.state.dataProducer.send(encodedMessage)
      this.log(`发送门状态数据: ${doorName}, 状态: ${isOpen ? '打开' : '关闭'}`)
    } catch (error) {
      this.log(`发送门状态失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 🥚 发送鸡蛋发射数据
   */
  public sendEggShoot(position: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }): void {
    if (!this.state.dataProducer || !this.state.peerId) {
      this.log('数据生产者未初始化，无法发送鸡蛋发射数据')
      return
    }

    try {
      const eggShootMessage: EggShootData = {
        type: 'eggShoot',
        peerId: this.state.peerId,
        timestamp: Date.now(),
        position,
        velocity
      }

      const encodedMessage = new TextEncoder().encode(JSON.stringify(eggShootMessage))
      this.state.dataProducer.send(encodedMessage)
      this.log(`发送鸡蛋发射数据: position(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`)
    } catch (error) {
      this.log(`发送鸡蛋发射数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 发送弹窗信息
   */
  public sendPopupMessageToUser(peerId:string,message:string):void{
    try {
      if (!this.state.dataProducer || !this.state.peerId) {
        this.log('数据生产者未初始化，无法发送弹窗数据')
        return
      }
      const popupMessage: PopupData = {
        type: 'popup',
        peerId: this.state.peerId!,
        toPeerId:peerId,
        timestamp: Date.now(),
        message
      }
      const encodedMessage = new TextEncoder().encode(JSON.stringify(popupMessage))

      this.state.dataProducer.send(encodedMessage)
    }
    catch (error) {
      this.log(`发送鸡蛋发射数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 开始模型状态传输
   * @param getModelStateFunction 获取模型状态的函数
   * @param updateRate 更新频率（每秒次数），默认60次
   */
  public startModelStateTransmission(
    getModelStateFunction: () => ModelStateData['state'] | null,
    updateRate: number = 60
  ): void {
    if (this.modelStateInterval) {
      this.stopModelStateTransmission()
    }

    this.modelStateUpdateRate = updateRate
    const intervalMs = 1000 / this.modelStateUpdateRate

    this.modelStateInterval = window.setInterval(() => {
      const currentTime = Date.now()

      // 限制发送频率，避免过于频繁
      if (currentTime - this.lastModelStateTime < intervalMs) {
        return
      }

      const modelState = getModelStateFunction()
      if (modelState) {
        this.sendModelState(modelState)
        this.lastModelStateTime = currentTime
      }
    }, intervalMs)

    this.log(`开始模型状态传输，更新频率: ${updateRate}次/秒`)
  }

  /**
   * 停止模型状态传输
   */
  public stopModelStateTransmission(): void {
    if (this.modelStateInterval) {
      clearInterval(this.modelStateInterval)
      this.modelStateInterval = undefined
      this.log('停止模型状态传输')
    }
  }

  /**
   * 设置模型状态回调
   */
  public setModelStateCallback(callback: ModelStateCallback): void {
    this.modelStateCallback = callback
  }

  /**
   * 🚪 设置门状态回调
   */
  public setDoorStateCallback(callback: DoorStateCallback): void {
    this.doorStateCallback = callback
  }

  /**
   * 🥚 设置鸡蛋发射回调
   */
  public setEggShootCallback(callback: EggShootCallback): void {
    this.eggShootCallback = callback
  }

  public setPopupMessageCallback(callback: PopupMessageCallback): void {
    this.popupMessageCallback = callback
  }


  /**
   * 启用数据通道
   */
  public async enableDataChannel(): Promise<void> {
    if (!this.state.producerTransport) {
      throw new Error('生产者传输未初始化')
    }

    try {
      this.state.dataProducer = await this.state.producerTransport.produceData({
        label: 'chat',
        protocol: 'simple-chat'
      })

      this.log('数据通道已启用')
    } catch (error) {
      this.log(`启用数据通道失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  }





  /**
   * 获取当前状态
   */
  public getState(): AppState {
    return { ...this.state }
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.state.socket?.connected || false
  }

  /**
   * 检查是否在房间中
   */
  public isInRoom(): boolean {
    return !!(this.state.roomId && this.state.peerId)
  }

  /**
   * 消费数据生产者
   */
  private async consumeData(dataProducerId: string, producerPeerId: string): Promise<void> {
    if (!this.state.socket || !this.state.consumerTransport || !this.state.roomId || !this.state.peerId) {
      this.log('缺少消费数据所需的参数')
      return
    }

    // 如果已经在消费这个数据生产者，直接返回
    if (this.state.dataConsumers.has(dataProducerId)) {
      this.log(`已经在消费数据生产者 ${dataProducerId}`)
      return
    }

    try {
      this.log(`开始消费数据，生产者ID: ${dataProducerId}`)

      const dataConsumer = await new Promise<any>((resolve, reject) => {
        this.state.socket!.emit('consumeData', {
          roomId: this.state.roomId,
          consumerPeerId: this.state.peerId,
          dataProducerId
        }, (response: ProduceDataResponse) => {
          if (response.error) {
            reject(new Error(response.error))
            return
          }

          if (!response.id) {
            reject(new Error('无效的数据消费者ID'))
            return
          }

          const { id, label, protocol, streamId } = response
          this.state.consumerTransport!.consumeData({
            id,
            dataProducerId,
            sctpStreamParameters: {
              streamId: streamId || 0,
              ordered: true
            },
            label: label || '',
            protocol: protocol || ''
          })
          .then(resolve)
          .catch(reject)
        })
      })

      // 关联数据消费者ID与生产者ID
      this.state.dataConsumers.set(dataProducerId, { dataConsumer, producerPeerId })

      // 处理数据消息接收
      dataConsumer.on('message', (message: ArrayBuffer) => {
        try {
          const decodedMessage = new TextDecoder().decode(message)
          const data: DataChannelMessage = JSON.parse(decodedMessage)

          if (data.type === 'chat') {
            // 处理聊天消息
            const senderName = this.peerNames.get(producerPeerId) || producerPeerId
            this.log(`收到聊天消息，来自 ${senderName}: ${data.message}`)
            this.addMessageCallback(data.message, false, senderName)
          } else if (data.type === 'modelState') {
            // 处理模型状态数据
            this.log(`收到模型状态，来自 ${producerPeerId}`)
            if (this.modelStateCallback) {
              this.modelStateCallback(this.peerNames.get(producerPeerId)!, data.state)
            }
          } else if (data.type === 'doorState') {
            // 🚪 处理门状态数据
            const senderName = this.peerNames.get(producerPeerId) || producerPeerId
            this.log(`收到门状态，来自 ${senderName}: ${data.doorName}, 状态: ${data.isOpen ? '打开' : '关闭'}`)
            if (this.doorStateCallback) {
              this.doorStateCallback(data.doorName, data.doorNearName, data.visible, data.isOpen)
            }
          } else if (data.type === 'eggShoot') {
            // 🥚 处理鸡蛋发射数据
            const senderName = this.peerNames.get(producerPeerId) || producerPeerId
            this.log(`收到鸡蛋发射数据，来自 ${senderName}`)
            if (this.eggShootCallback) {
              this.eggShootCallback(senderName, data.position, data.velocity)
            }
          } else if(data.type === 'popup') {
            if(data.toPeerId === this.state.peerId) {
              this.log(`收到弹窗信息，来自 ${data.peerId}: ${data.message}`)
              if(this.popupMessageCallback) {
                this.popupMessageCallback(data.message)
              }
            }
          }
        } catch (error) {
          // 兼容旧版本的纯文本消息
          const decodedMessage = new TextDecoder().decode(message)
          const senderName = this.peerNames.get(producerPeerId) || producerPeerId
          this.log(`收到消息，来自 ${senderName}: ${decodedMessage}`)
          this.addMessageCallback(decodedMessage, false, senderName)
        }
      })

      this.log(`数据消费者已创建，ID: ${dataConsumer.id}`)
    } catch (error) {
      this.log(`消费数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 消费音频
   */
  private async consumeAudio(producerId: string, producerPeerId: string): Promise<void> {
    if (!this.state.socket || !this.state.consumerTransport || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数')
    }

    try {
      this.log(`开始消费音频，生产者ID: ${producerId}, 生产者PeerID: ${producerPeerId}`)

      const result = await this.emitAsync<ConsumeResponse>('consume', {
        roomId: this.state.roomId,
        consumerPeerId: this.state.peerId,
        producerId,
        rtpCapabilities: this.state.rtpCapabilities
      })

      if (result.error || !result.id || !result.rtpParameters) {
        throw new Error(result.error || '消费音频失败')
      }

      const consumer = await this.state.consumerTransport.consume({
        id: result.id,
        producerId,
        kind: result.kind as any,
        rtpParameters: result.rtpParameters,
        appData: { producerPeerId }
      })

      this.state.audioConsumers.set(producerId, { consumer, producerPeerId })

      consumer.on('transportclose', () => {
        this.log(`音频消费者传输关闭: ${producerPeerId}`)
        this.state.audioConsumers.delete(producerId)
      })

      // 创建音频元素播放音频
      const audioElement = document.createElement('audio')
      audioElement.id = `audio-${producerId}`
      audioElement.srcObject = new MediaStream([consumer.track])
      audioElement.autoplay = true
      audioElement.controls = false
      audioElement.muted = false
      audioElement.volume = 0.8
      audioElement.style.display = 'none'
      document.body.appendChild(audioElement)

      // 监听音频播放事件
      audioElement.addEventListener('loadedmetadata', () => {
        this.log(`音频元素已加载，来自 ${producerPeerId}`)
      })

      audioElement.addEventListener('error', (e) => {
        this.log(`音频播放错误: ${e}`)
      })

      // 恢复消费者
      await this.emitAsync('resumeConsumer', {
        roomId: this.state.roomId,
        consumerId: consumer.id
      })

      this.log(`开始消费来自 ${producerPeerId} 的音频`)
    } catch (error) {
      this.log(`消费音频失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 切换麦克风状态
   */
  public async toggleMicrophone(): Promise<boolean> {
    try {
      if (this.state.microphoneEnabled) {
        await this.disableMicrophone()
        return false
      } else {
        await this.enableMicrophone()
        return true
      }
    } catch (error) {
      this.log(`切换麦克风失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  }

  /**
   * 启用麦克风
   */
  private async enableMicrophone(): Promise<void> {
    if (!this.state.socket || !this.state.producerTransport || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数')
    }

    try {
      this.log('正在请求麦克风权限...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      const track = stream.getAudioTracks()[0]
      if (!track) {
        throw new Error('无法获取音频轨道')
      }

      this.log('获取到麦克风音频轨道')

      this.state.audioProducer = await this.state.producerTransport.produce({
        track,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        },
        appData: {
          peerId: this.state.peerId,
          roomId: this.state.roomId
        }
      })

      this.log(`音频生产者已创建，ID: ${this.state.audioProducer.id}`)

      this.state.audioProducer.on('transportclose', () => {
        this.log('音频生产者传输关闭')
        this.state.audioProducer = null
        this.state.microphoneEnabled = false
      })

      this.state.microphoneEnabled = true
    } catch (error) {
      let errorMessage = '未知错误'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          errorMessage = '麦克风权限被拒绝。请在浏览器设置中允许访问麦克风。'
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备。'
        } else if (error.name === 'NotReadableError') {
          errorMessage = '麦克风被其他应用程序占用。'
        } else {
          errorMessage = error.message
        }
      }

      this.log(`启用麦克风失败: ${errorMessage}`)
      throw new Error(errorMessage)
    }
  }

  /**
   * 禁用麦克风
   */
  private async disableMicrophone(): Promise<void> {
    if (this.state.audioProducer) {
      this.state.audioProducer.close()
      this.state.audioProducer = null
      this.state.microphoneEnabled = false
      this.log('麦克风已关闭')
    }
  }

  /**
   * 设置房间配置回调
   */
  setRoomConfigCallback(callback: (config: RoomConfig) => void) {
    this.updateRoomConfigCallback = callback
  }

  /**
   * 通知服务器清除鸡蛋标记
   */
  clearEgg(eggId: string, id:string ,username: string, roomId: string) {
    if (!this.state.socket) {
      console.warn('⚠️ Socket未连接，无法清除鸡蛋标记')
      return
    }

    console.log(`🥚 通知服务器清除鸡蛋标记: ${eggId}`)
    this.state.socket.emit('clearEgg', {
      id,
      eggId,
      username,
      roomId
    })
  }

  /**
   * Socket.IO异步调用封装
   */
  private emitAsync<T>(event: string, data: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.state.socket) {
        reject(new Error('Socket未连接'))
        return
      }

      this.state.socket.emit(event, data, (response: T) => {
        resolve(response)
      })
    })
  }
}
