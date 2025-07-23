import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import type {
    AppState,
    ConnectionStatus,
    RouterRtpCapabilitiesResponse,
    TransportResponse,
    ConnectTransportResponse,
    ProduceDataResponse,
    ProduceResponse,
    GetProducersResponse,
    JoinedEventData,
    NewDataProducerEventData
} from './types';

// 日志类型
type LogCallback = (message: string) => void;

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
  };

  private logCallback: LogCallback;
  private updateConnectionStatusCallback: (status: ConnectionStatus, details?: string) => void;
  private updateRoomInfoCallback: (roomInfo: { roomId: string; peerId: string } | null) => void;
  private updatePeersListCallback: (peers: { id: string; name: string }[]) => void;
  private addMessageCallback: (content: string, isSent: boolean) => void;
  
  constructor(
    logCallback: LogCallback,
    updateConnectionStatus: (status: ConnectionStatus, details?: string) => void,
    updateRoomInfo: (roomInfo: { roomId: string; peerId: string } | null) => void,
    updatePeersList: (peers: { id: string; name: string }[]) => void,
    addMessage: (content: string, isSent: boolean) => void
  ) {
    this.logCallback = logCallback;
    this.updateConnectionStatusCallback = updateConnectionStatus;
    this.updateRoomInfoCallback = updateRoomInfo;
    this.updatePeersListCallback = updatePeersList;
    this.addMessageCallback = addMessage;
  }

  /**
   * 日志函数
   */
  private log(message: string): void {
    this.logCallback(message);
  }

  /**
   * 连接到Socket.IO服务器
   */
  public connectSocket(): void {
    // 检测当前环境是HTTP还是HTTPS
    const protocol = window.location.protocol;
    const isSecure = protocol === 'https:';
    
    // 根据环境选择WebSocket连接方式
    const serverUrl = isSecure 
      ? `wss://${window.location.hostname}:${window.location.port}` 
      : `ws://${window.location.hostname}:3000`; // 默认端口3000
    
    this.log(`正在连接到服务器：${serverUrl}`);
    this.updateConnectionStatusCallback('connecting');
    
    this.state.socket = io(serverUrl);
    
    // 设置连接事件处理
    this.setupSocketEvents();
  }

  /**
   * 设置Socket事件监听
   */
  private setupSocketEvents(): void {
    if (!this.state.socket) return;

    // 监听服务器连接事件
    this.state.socket.on('connect', () => {
      this.log('已连接到Socket.IO服务器');
      this.updateConnectionStatusCallback('connected', '已连接到服务器');
    });

    // 监听服务器断开连接事件
    this.state.socket.on('disconnect', () => {
      this.log('与Socket.IO服务器断开连接');
      this.updateConnectionStatusCallback('disconnected', '与服务器断开连接');
      this.cleanupResources();
    });

    // 监听加入房间成功事件
    this.state.socket.on('joined', async ({ roomId, peerId, peers }) => {
      this.log(`成功加入房间: ${roomId}, 您的ID是: ${peerId}`);
      
      // 更新状态
      this.state.roomId = roomId;
      this.state.peerId = peerId;
      
      // 更新UI
      this.updateConnectionStatusCallback('connected', '已加入房间');
      this.updateRoomInfoCallback({ roomId, peerId });
      this.updatePeersListCallback(peers);
      document.getElementById('joinBtn')?.setAttribute('disabled', 'disabled');
      document.getElementById('leaveBtn')?.removeAttribute('disabled');
      document.getElementById('micBtn')?.removeAttribute('disabled');
      
      // 初始化WebRTC连接
      await this.initializeWebRTC();
    });

    // 监听新成员加入事件
    this.state.socket.on('peerJoined', ({ peerId, name }) => {
      this.log(`新成员加入: ${name} (${peerId})`);
      this.updatePeersListCallback([{ id: peerId, name }]);
    });

    // 监听成员离开事件
    this.state.socket.on('peerLeft', ({ peerId }) => {
      this.log(`成员离开: ${peerId}`);
      
      // 从消费者列表中移除该成员的数据消费者
      for (const [dataProducerId, { producerPeerId, dataConsumer }] of this.state.dataConsumers) {
        if (producerPeerId === peerId) {
          dataConsumer.close();
          this.state.dataConsumers.delete(dataProducerId);
          this.log(`关闭了来自 ${peerId} 的数据消费者`);
        }
      }
      
      // 更新UI，移除该成员
      const peersList = document.getElementById('peersList');
      const peerItem = document.getElementById(`peer-${peerId}`);
      if (peersList && peerItem) {
        peersList.removeChild(peerItem);
      }
    });

    // 监听新的数据生产者事件
    this.state.socket.on('newDataProducer', async ({ dataProducerId, producerPeerId, label, protocol }) => {
      this.log(`新的数据生产者: ${producerPeerId} (${label})`);
      
      // 检查是否已经有这个数据生产者的消费者
      if (this.state.dataConsumers.has(dataProducerId)) {
        this.log(`已经在消费数据生产者 ${dataProducerId}`);
        return;
      }
      
      try {
        // 消费这个数据生产者
        await this.consumeData(dataProducerId, producerPeerId);
      } catch (error) {
        this.log(`消费数据生产者失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });

    // 监听数据生产者关闭事件
    this.state.socket.on('dataProducerClosed', ({ dataProducerId, producerPeerId }) => {
      this.log(`数据生产者关闭: ${producerPeerId}`);
      
      const dataConsumerInfo = this.state.dataConsumers.get(dataProducerId);
      if (dataConsumerInfo) {
        dataConsumerInfo.dataConsumer.close();
        this.state.dataConsumers.delete(dataProducerId);
      }
    });
  }

  /**
   * 初始化WebRTC
   */
  private async initializeWebRTC(): Promise<void> {
    try {
      this.log('初始化WebRTC连接...');
      
      // 1. 加载mediasoup设备
      this.state.device = new Device();
      
      // 2. 获取router的RTP能力
      const routerRtpCapabilities = await this.emitAsync<RouterRtpCapabilitiesResponse>(
        'getRouterRtpCapabilities', 
        {}
      );
      
      if (!routerRtpCapabilities.rtpCapabilities) {
        throw new Error('无法获取RTP能力');
      }
      
      this.state.rtpCapabilities = routerRtpCapabilities.rtpCapabilities;
      this.log('获取到RTP能力');
      
      // 3. 加载设备
      await this.state.device.load({ routerRtpCapabilities: this.state.rtpCapabilities });
      this.log('mediasoup设备已加载');
      
      // 4. 创建生产者传输
      await this.createProducerTransport();
      
      // 5. 创建消费者传输
      await this.createConsumerTransport();
      
      // 6. 获取当前房间内的所有数据生产者
      await this.getExistingProducers();
      
      this.log('WebRTC连接初始化完成');
    } catch (error) {
      this.log(`WebRTC初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建生产者传输
   */
  private async createProducerTransport(): Promise<void> {
    if (!this.state.socket || !this.state.device || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数');
    }

    const producerTransportInfo = await this.emitAsync<TransportResponse>(
      'createWebRtcTransport', 
      { roomId: this.state.roomId, peerId: this.state.peerId, consuming: false }
    );
    
    if (producerTransportInfo.error || !producerTransportInfo.id) {
      throw new Error(`创建生产者传输失败: ${producerTransportInfo.error || '未知错误'}`);
    }
    
    this.log('生产者传输已创建');
    
    this.state.producerTransport = this.state.device.createSendTransport(producerTransportInfo);
    
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
        );
        
        if (result.error) {
          errback(new Error(result.error));
          return;
        }
        
        callback();
        this.log('生产者传输已连接');
      } catch (error) {
        errback(error instanceof Error ? error : new Error('连接失败'));
        this.log(`生产者传输连接错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
    
    // 处理生产者传输生产数据事件
    this.state.producerTransport.on('producedata', async (parameters, callback, errback) => {
      const { sctpStreamParameters, label, protocol, appData } = parameters;

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
        );

        if (result.error || !result.id) {
          errback(new Error(result.error || '创建数据生产者失败'));
          return;
        }

        callback({ id: result.id });
        this.log(`数据生产者已创建，ID: ${result.id}`);
      } catch (error) {
        errback(error instanceof Error ? error : new Error('创建失败'));
        this.log(`数据生产失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });

    // 处理生产者传输生产音频事件
    this.state.producerTransport.on('produce', async (parameters, callback, errback) => {
      const { kind, rtpParameters, appData } = parameters;

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
        );

        if (result.error || !result.id) {
          errback(new Error(result.error || '创建音频生产者失败'));
          return;
        }

        callback({ id: result.id });
        this.log(`音频生产者已创建，ID: ${result.id}`);
      } catch (error) {
        errback(error instanceof Error ? error : new Error('创建失败'));
        this.log(`音频生产失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
    
    // 创建数据生产者
    this.state.dataProducer = await this.state.producerTransport.produceData({
      ordered: true,
      label: 'chat',
      protocol: 'simple-chat',
      appData: { peerId: this.state.peerId },
    });
    
    this.log(`数据生产者已准备就绪`);
    
    // 更新UI状态
    document.getElementById('sendBtn')?.removeAttribute('disabled');
  }

  /**
   * 创建消费者传输
   */
  private async createConsumerTransport(): Promise<void> {
    if (!this.state.socket || !this.state.device || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数');
    }

    const consumerTransportInfo = await this.emitAsync<TransportResponse>(
      'createWebRtcTransport', 
      { roomId: this.state.roomId, peerId: this.state.peerId, consuming: true }
    );
    
    if (consumerTransportInfo.error || !consumerTransportInfo.id) {
      throw new Error(`创建消费者传输失败: ${consumerTransportInfo.error || '未知错误'}`);
    }
    
    this.log('消费者传输已创建');
    
    this.state.consumerTransport = this.state.device.createRecvTransport(consumerTransportInfo);
    
    // 处理消费者传输连接事件
    this.state.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        const result = await this.emitAsync<ConnectTransportResponse>(
          'connectWebRtcTransport', 
          {
            roomId: this.state.roomId,
            peerId: this.state.peerId,
            transportId: this.state.consumerTransport!.id,
            dtlsParameters,
            isConsumer: true
          }
        );
        
        if (result.error) {
          errback(new Error(result.error));
          return;
        }
        
        callback();
        this.log('消费者传输已连接');
      } catch (error) {
        errback(error instanceof Error ? error : new Error('连接失败'));
        this.log(`消费者传输连接错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
  }

  /**
   * 获取房间内现有的生产者
   */
  private async getExistingProducers(): Promise<void> {
    if (!this.state.socket || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数');
    }

    try {
      const { producers, error } = await this.emitAsync<GetProducersResponse>(
        'getProducers', 
        { roomId: this.state.roomId, peerId: this.state.peerId }
      );
      
      if (error) {
        throw new Error(error);
      }
      
      if (!producers || producers.length === 0) {
        return;
      }
      
      // 记录已经尝试消费的生产者ID，避免重复消费
      const attemptedProducerIds = new Set<string>();
      
      // 消费每个数据生产者
      for (const producer of producers) {
        const { producerId, producerPeerId } = producer;
        
        // 如果已经尝试过这个生产者，或者已经有对应的消费者，则跳过
        if (attemptedProducerIds.has(producerId) || this.state.dataConsumers.has(producerId)) {
          continue;
        }
        
        // 标记为已尝试
        attemptedProducerIds.add(producerId);
        
        try {
          // 尝试消费数据
          await this.consumeData(producerId, producerPeerId);
        } catch (error) {
          // 忽略错误，可能是因为这是一个媒体生产者而不是数据生产者
          this.log(`尝试消费生产者 ${producerId} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    } catch (error) {
      this.log(`获取房间内现有生产者失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 消费数据生产者
   */
  private async consumeData(dataProducerId: string, producerPeerId: string): Promise<void> {
    if (!this.state.socket || !this.state.consumerTransport || !this.state.roomId || !this.state.peerId) {
      this.log('缺少消费数据所需的参数');
      return;
    }

    // 如果已经在消费这个数据生产者，直接返回
    if (this.state.dataConsumers.has(dataProducerId)) {
      this.log(`已经在消费数据生产者 ${dataProducerId}`);
      return;
    }

    try {
      this.log(`开始消费数据，生产者ID: ${dataProducerId}`);
      
      // 最多尝试3次
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const dataConsumer = await new Promise<any>((resolve, reject) => {
            this.state.socket!.emit('consumeData', {
              roomId: this.state.roomId,
              consumerPeerId: this.state.peerId,
              dataProducerId
            }, (response: ProduceDataResponse) => {
              if (response.error) {
                reject(new Error(response.error));
                return;
              }
              
              if (!response.id) {
                reject(new Error('无效的数据消费者ID'));
                return;
              }
              
              const { id, label, protocol,streamId } = response;
              console.log(streamId);
              this.state.consumerTransport!.consumeData({
                id,
                dataProducerId,
                sctpStreamParameters: {
                  streamId: streamId,  // 使用服务端返回的streamId
                  ordered: true
                },
                label: label || '',
                protocol: protocol || ''
              })
              .then(resolve)
              .catch(reject);
            });
          });
          
          // 关联数据消费者ID与生产者ID
          this.state.dataConsumers.set(dataProducerId, { dataConsumer, producerPeerId });
          
          // 处理数据消息接收
          dataConsumer.on('message', (message: ArrayBuffer) => {
            const decodedMessage = new TextDecoder().decode(message);
            this.log(`收到消息，来自 ${producerPeerId}: ${decodedMessage}`);
            this.addMessageCallback(`${producerPeerId}: ${decodedMessage}`, false);
          });
          
          this.log(`数据消费者已创建，ID: ${dataConsumer.id}`);
          return; // 成功创建，退出函数
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('未知错误');
          this.log(`消费数据尝试 ${attempts}/${maxAttempts} 失败: ${lastError.message}`);
          
          // 等待一小段时间再重试
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // 如果所有尝试都失败了，抛出最后一个错误
      if (lastError) {
        throw lastError;
      }
    } catch (error) {
      this.log(`消费数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 发送消息
   */
  public sendMessage(message: string): void {
    if (!message || !this.state.dataProducer) return;
    
    try {
      const encodedMessage = new TextEncoder().encode(message);
      this.state.dataProducer.send(encodedMessage);
      this.log(`消息已发送: ${message}`);
      this.addMessageCallback(`我: ${message}`, true);
    } catch (error) {
      this.log(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 加入房间
   */
  public joinRoom(roomId: string | null, userName: string): void {
    if (!this.state.socket) {
      this.log('Socket连接未初始化');
      return;
    }
    
    this.log(`尝试${roomId ? '加入' : '创建'}房间...`);
    
    // 发送加入房间请求
    this.state.socket.emit('createOrJoin', { 
      roomId: roomId || undefined, 
      name: userName 
    });
  }

  /**
   * 离开房间
   */
  public leaveRoom(): void {
    if (!this.state.socket || !this.state.roomId || !this.state.peerId) {
      return;
    }
    
    this.log('正在离开房间...');
    this.state.socket.emit('leave', { 
      roomId: this.state.roomId, 
      peerId: this.state.peerId 
    });
    
    this.cleanupResources();
  }

  /**
   * 清理资源
   */
  public cleanupResources(): void {
    if (this.state.dataProducer) {
      this.state.dataProducer.close();
      this.state.dataProducer = null;
    }
    
    for (const [_, { dataConsumer }] of this.state.dataConsumers) {
      dataConsumer.close();
    }
    this.state.dataConsumers.clear();
    
    if (this.state.producerTransport) {
      this.state.producerTransport.close();
      this.state.producerTransport = null;
    }
    
    if (this.state.consumerTransport) {
      this.state.consumerTransport.close();
      this.state.consumerTransport = null;
    }
    
    // 重置状态
    this.state.roomId = null;
    this.state.peerId = null;
    
    // 更新UI
    document.getElementById('joinBtn')?.removeAttribute('disabled');
    document.getElementById('leaveBtn')?.setAttribute('disabled', 'disabled');
    document.getElementById('sendBtn')?.setAttribute('disabled', 'disabled');
    
    this.updateConnectionStatusCallback('connected', '已连接到服务器');
    this.updateRoomInfoCallback(null);
    this.updatePeersListCallback([]);
    
    this.log('已清理所有资源');
  }

  /**
   * Socket.IO异步调用封装
   */
  private emitAsync<T>(event: string, data: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.state.socket) {
        reject(new Error('Socket未连接'));
        return;
      }

      this.state.socket.emit(event, data, (response: T) => {
        resolve(response);
      });
    });
  }

  /**
   * 切换麦克风状态
   */
  public async toggleMicrophone(): Promise<boolean> {
    try {
      if (this.state.microphoneEnabled) {
        await this.disableMicrophone();
        return false;
      } else {
        await this.enableMicrophone();
        return true;
      }
    } catch (error) {
      this.log(`切换麦克风失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 启用麦克风
   */
  private async enableMicrophone(): Promise<void> {
    if (!this.state.socket || !this.state.producerTransport || !this.state.roomId || !this.state.peerId) {
      throw new Error('缺少初始化参数');
    }

    try {
      this.log('正在请求麦克风权限...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const track = stream.getAudioTracks()[0];
      if (!track) {
        throw new Error('无法获取音频轨道');
      }

      this.log('获取到麦克风音频轨道');

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
      });

      this.log(`音频生产者已创建，ID: ${this.state.audioProducer.id}`);

      this.state.audioProducer.on('transportclose', () => {
        this.log('音频生产者传输关闭');
        this.state.audioProducer = null;
        this.state.microphoneEnabled = false;
      });

      this.state.microphoneEnabled = true;
    } catch (error) {
      let errorMessage = '未知错误';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          errorMessage = '麦克风权限被拒绝。请在浏览器设置中允许访问麦克风。';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到麦克风设备。';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '麦克风被其他应用程序占用。';
        } else {
          errorMessage = error.message;
        }
      }

      this.log(`启用麦克风失败: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  /**
   * 禁用麦克风
   */
  private async disableMicrophone(): Promise<void> {
    if (this.state.audioProducer) {
      this.state.audioProducer.close();
      this.state.audioProducer = null;
      this.state.microphoneEnabled = false;
      this.log('麦克风已关闭');
    }
  }
}