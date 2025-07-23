import * as mediasoup from 'mediasoup';
import { config } from '../config/config';
import { Worker, Router, WebRtcTransport, Producer, Consumer, MediaKind, DataProducer, DataConsumer } from 'mediasoup/node/lib/types';
import os from 'node:os'
const totalCpu = os.cpus().length;
// 保存mediasoup的workers和routers
export class MediasoupHandler {
  private workers: Worker[] = [];
  private router: Router | null = null;
  private roomTransports: Map<string, Map<string, WebRtcTransport>> = new Map(); // roomId -> {peerId -> transport}
  private producers: Map<string, Producer> = new Map(); // producerId -> Producer
  private consumers: Map<string, Consumer> = new Map(); // consumerId -> Consumer
  private dataProducers: Map<string, DataProducer> = new Map(); // dataProducerId -> DataProducer
  private dataConsumers: Map<string, DataConsumer> = new Map(); // dataConsumerId -> DataConsumer
  // 启动mediasoup workers
  async init() {
    try {
      // 创建mediasoup worker
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        console.error('mediasoup worker died, exiting...');
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      console.log(`Mediasoup worker created`);

      // 创建router
      this.router = await worker.createRouter({
        mediaCodecs: config.mediasoup.router.mediaCodecs,
      });

      console.log('Mediasoup router created');

      return worker;
    } catch (error) {
      console.error('Failed to start mediasoup:', error);
      throw error;
    }
  }

  // 获取Router的RTP能力
  getRtpCapabilities() {
    if (!this.router) throw new Error('Router not initialized');
    return this.router.rtpCapabilities;
  }

  // 创建WebRTC传输
  async createWebRtcTransport(roomId: string, peerId: string, consuming: boolean = false) {
    if (!this.router) throw new Error('Router not initialized');

    try {
      const transport = await this.router.createWebRtcTransport({
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
        // 添加SCTP选项以支持数据通道
        enableSctp: true,
        numSctpStreams: { OS: 65535, MIS: 65535 }
      });

      // 保存transport
      if (!this.roomTransports.has(roomId)) {
        this.roomTransports.set(roomId, new Map());
      }

      const peerKey = `${peerId}-${consuming ? 'consumer' : 'producer'}`;
      this.roomTransports.get(roomId)?.set(peerKey, transport);
      console.log(`Transport created and saved: roomId=${roomId}, peerId=${peerId}, peerKey=${peerKey}, consuming=${consuming}`);

      // 监听transport关闭事件
      transport.on('@close', () => {
        console.log('WebRTC transport closed', { roomId, peerId });
        this.roomTransports.get(roomId)?.delete(peerKey);
      });

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        // 添加SCTP参数到返回值中
        sctpParameters: transport.sctpParameters,
      };
    } catch (error) {
      console.error('Error creating WebRTC transport:', error);
      throw error;
    }
  }

  // 连接WebRTC传输
  async connectWebRtcTransport(roomId: string, peerId: string, transportId: string, dtlsParameters: any, isConsumer: boolean = false) {
    const peerKey = `${peerId}-${isConsumer ? 'consumer' : 'producer'}`;
    const transport = this.roomTransports.get(roomId)?.get(peerKey);

    if (!transport) {
      throw new Error(`Transport not found for ${peerId}`);
    }

    await transport.connect({ dtlsParameters });
    return { connected: true };
  }

  // 创建生产者(发送媒体流)
  async produce(roomId: string, peerId: string, kind: MediaKind, rtpParameters: any, appData: any) {
    const peerKey = `${peerId}-producer`;
    const transport = this.roomTransports.get(roomId)?.get(peerKey);

    if (!transport) {
      throw new Error(`Producer transport not found for ${peerId}`);
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId },
    });

    this.producers.set(producer.id, producer);

    // 监听生产者关闭事件
    producer.on('transportclose', () => {
      console.log('Producer transport closed', { producerId: producer.id });
      this.producers.delete(producer.id);
    });

    return { id: producer.id };
  }

  // 创建消费者(接收媒体流)
  async consume(roomId: string, consumerPeerId: string, producerId: string, rtpCapabilities: any) {
    if (!this.router) throw new Error('Router not initialized');

    // 检查是否可以消费
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Cannot consume producer ${producerId}`);
    }

    const peerKey = `${consumerPeerId}-consumer`;
    const transport = this.roomTransports.get(roomId)?.get(peerKey);

    console.log(`Looking for consumer transport: roomId=${roomId}, consumerPeerId=${consumerPeerId}, peerKey=${peerKey}`);
    console.log(`Available transports for room ${roomId}:`, Array.from(this.roomTransports.get(roomId)?.keys() || []));

    if (!transport) {
      throw new Error(`Consumer transport not found for ${consumerPeerId}`);
    }

    try {
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // 首先暂停，然后由客户端恢复
      });

      this.consumers.set(consumer.id, consumer);

      // 监听关闭事件
      consumer.on('transportclose', () => {
        console.log('Consumer transport closed', { consumerId: consumer.id });
        this.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        console.log('Associated producer closed', { consumerId: consumer.id });
        this.consumers.delete(consumer.id);
      });

      return {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
      };
    } catch (error) {
      console.error('Error creating consumer:', error);
      throw error;
    }
  }

  // 恢复消费者
  async resumeConsumer(consumerId: string) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    await consumer.resume();
    return { resumed: true };
  }

  // 关闭生产者
  async closeProducer(producerId: string) {
    const producer = this.producers.get(producerId);
    if (!producer) {
      throw new Error(`Producer not found: ${producerId}`);
    }

    producer.close();
    this.producers.delete(producerId);
    return { closed: true };
  }

  // 创建 DataProducer
  async createDataProducer(roomId: string, peerId: string, label: string, protocol: string, appData: any,sctpStreamParameters:mediasoup.types.SctpStreamParameters) {
    const peerKey = `${peerId}-producer`;
    const transport = this.roomTransports.get(roomId)?.get(peerKey);
    
    if (!transport) {
      throw new Error(`Producer transport not found for ${peerId}`);
    }
    // const streamId = Date.now() % 65535;

    const dataProducer = await transport.produceData({
      label,
      protocol,
      appData: { ...appData, peerId, roomId },
      // 添加 SCTP 流参数
      sctpStreamParameters
    });
    console.log('数据生产者的 ID:', dataProducer.id);
    console.log('sctpStreamParameters:',sctpStreamParameters);
    
    // 保存dataProducer
    this.dataProducers.set(dataProducer.id, dataProducer); 
    // 监听dataProducer关闭事件
    dataProducer.on('transportclose', () => {
      console.log('DataProducer transport closed', { dataProducerId: dataProducer.id });
      this.dataProducers.delete(dataProducer.id);
    });

    return {
      id: dataProducer.id,
      label: dataProducer.label,
      protocol: dataProducer.protocol,
      streamId:dataProducer.sctpStreamParameters!.streamId
    };
  }

  // 创建 DataConsumer
  async createDataConsumer(roomId: string, consumerPeerId: string, dataProducerId: string) {
    const peerKey = `${consumerPeerId}-consumer`;
    const transport = this.roomTransports.get(roomId)?.get(peerKey);
    
    if (!transport) {
      throw new Error(`Consumer transport not found for ${consumerPeerId}`);
    }

    const dataProducer = this.dataProducers.get(dataProducerId);
    if (!dataProducer) {
      throw new Error(`DataProducer not found: ${dataProducerId}`);
    }

    try {
      console.log(`Creating DataConsumer for peer ${consumerPeerId} with dataProducerId ${dataProducerId}`);
      
      const dataConsumer = await transport.consumeData({
        dataProducerId,
        ordered: true,
      });

      // 保存dataConsumer
      this.dataConsumers.set(dataConsumer.id, dataConsumer);
      console.log(`DataConsumer created successfully: ${dataConsumer.id}`);

      // 监听dataConsumer关闭事件
      dataConsumer.on('transportclose', () => {
        console.log('DataConsumer transport closed', { dataConsumerId: dataConsumer.id });
        this.dataConsumers.delete(dataConsumer.id);
      });

      dataConsumer.on('dataproducerclose', () => {
        console.log('Associated DataProducer closed', { dataConsumerId: dataConsumer.id });
        this.dataConsumers.delete(dataConsumer.id);
      });

      return {
        id: dataConsumer.id,
        label: dataConsumer.label,
        protocol: dataConsumer.protocol,
        streamId:dataConsumer.sctpStreamParameters!.streamId
      };
    } catch (error) {
      console.error('Error creating DataConsumer:', error);
      throw error;
    }
  }

  // 关闭 DataProducer
  async closeDataProducer(dataProducerId: string) {
    const dataProducer = this.dataProducers.get(dataProducerId);
    if (!dataProducer) {
      throw new Error(`DataProducer not found: ${dataProducerId}`);
    }

    dataProducer.close();
    this.dataProducers.delete(dataProducerId);
    return { closed: true };
  }

  // 在closeRoom方法中添加数据通道相关的清理
  async closeRoom(roomId: string) {
    const roomTransports = this.roomTransports.get(roomId);
    if (roomTransports) {
      for (const transport of roomTransports.values()) {
        transport.close();
      }
      this.roomTransports.delete(roomId);
      
      // 清理与该房间相关的DataProducer和DataConsumer
      this.dataProducers.forEach((dataProducer, id) => {
        if (dataProducer.appData.roomId === roomId) {
          dataProducer.close();
          this.dataProducers.delete(id);
        }
      });
      
      // DataConsumer的清理将通过transport关闭事件自动处理
    }
    return { closed: true };
  }

  // 获取mediasoup workers数量
  getWorkersCount() {
    return this.workers.length;
  }

  // 获取某个房间中的生产者数量
  getProducersCount(roomId: string) {
    let count = 0;
    this.producers.forEach(producer => {
      if (producer.appData.roomId === roomId) {
        count++;
      }
    });
    return count;
  }
}

// 导出单例
export const mediasoupHandler = new MediasoupHandler(); 