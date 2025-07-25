import { Device } from 'mediasoup-client';
import { types as mediasoupTypes } from "mediasoup-client";

import type { Socket } from 'socket.io-client';

// 应用程序状态接口
export interface AppState {
  socket: Socket | null;
  device: Device | null;
  rtpCapabilities: any;
  producerTransport: mediasoupTypes.Transport | null;
  consumerTransport: mediasoupTypes.Transport | null;
  dataProducer: mediasoupTypes.DataProducer | null;
  dataConsumers: Map<string, { dataConsumer: mediasoupTypes.DataConsumer; producerPeerId: string }>;
  audioProducer: mediasoupTypes.Producer | null;
  audioConsumers: Map<string, { consumer: mediasoupTypes.Consumer; producerPeerId: string }>;
  microphoneEnabled: boolean;
  roomId: string | null;
  peerId: string | null;
}

// 房间信息接口
export interface RoomInfo {
  roomId: string;
  peerId: string;
}

// 成员信息接口
export interface Peer {
  id: string;
  name: string;
}

// 连接状态类型
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Socket.IO事件接口
export interface JoinedEventData {
  roomId: string;
  peerId: string;
  peers: Peer[];
}

export interface PeerJoinedEventData {
  peerId: string;
  name: string;
}

export interface PeerLeftEventData {
  peerId: string;
}

export interface NewDataProducerEventData {
  dataProducerId: string;
  producerPeerId: string;
  label: string;
  protocol: string;
}

export interface DataProducerClosedEventData {
  dataProducerId: string;
  producerPeerId: string;
}

export interface ProducerEventData {
  producerId: string;
  producerPeerId: string;
  producerPeerName: string;
  kind?: string;
  type?: 'media' | 'data';
}

// 响应数据类型
export interface RouterRtpCapabilitiesResponse {
  rtpCapabilities?: any;
  error?: string;
}

export interface TransportResponse {
  id?: string;
  iceParameters?: any;
  iceCandidates?: any;
  dtlsParameters?: any;
  sctpParameters?: any;  // 添加 SCTP 参数
  error?: string;
}

export interface ConnectTransportResponse {
  connected?: boolean;
  error?: string;
}

export interface ProduceDataResponse {
  id?: string;
  label?: string;
  protocol?: string;
  error?: string;
  streamId?: number;
}

// 音频生产响应类型
export interface ProduceResponse {
  id?: string;
  error?: string;
}

// 消费响应类型
export interface ConsumeResponse {
  id?: string;
  kind?: string;
  rtpParameters?: any;
  producerPeerId?: string;
  error?: string;
}

export interface GetProducersResponse {
  producers?: ProducerEventData[];
  error?: string;
} 