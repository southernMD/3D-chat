import { v4 as uuidv4 } from 'uuid';
import { SchoolRoom } from './shcoolRoom';
import { Server } from 'socket.io';

// 参与者类型定义
export interface Peer {
  id: string;
  socketId: string;
  name: string;
  joinedAt: Date;
  lastActivity: Date;
  transports: string[];
  producers: string[];
  consumers: string[];
  dataProducers: string[];
  dataConsumers: string[];
  rtpCapabilities?: any;
}

// 房间类型枚举
export enum RoomType {
  DEFAULT = 'default',
  SCHOOL = 'school'
}

// 房间配置接口
export interface RoomConfig {
  name: string;
  description: string;
  maxUsers: string;
  isPrivate: boolean;
  enableVoice: boolean;
  enableText: boolean;
  map: RoomType;
}

// 房间类型定义
export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  peers: Map<string, Peer>;
  config?: RoomConfig;
  modelHash?: Map<string, string>;
  schoolRoom?: SchoolRoom; // 学校房间实例（仅当房间类型为school时存在）
}

// 房间管理类
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server | null = null;

  // 设置Socket.IO实例
  setIO(io: Server): void {
    this.io = io;
  }

  // 创建房间
  createRoom(name: string, config: RoomConfig, modelHash: string, userName: string): Room {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      name: name || `Room ${roomId.substring(0, 8)}`,
      createdAt: new Date(),
      peers: new Map(),
      config,
      modelHash: new Map([[userName, modelHash]]),
    };
    console.log(config.map,"地图是");
    
    // 如果是学校类型房间，创建SchoolRoom实例
    if (config.map === RoomType.SCHOOL && this.io) {
      room.schoolRoom = new SchoolRoom(roomId, this.io);
      room.schoolRoom.startBroadcast();
      console.log(`🏫 School room features enabled for room ${roomId}`);
    }

    this.rooms.set(roomId, room);
    console.log(`Room created: ${room.name} (${roomId})${modelHash ? ` with model ${modelHash}` : ''}`);


    return room;
  }

  //加入房间
  joinRoom(name: string, modelHash: string,userName:string): Room | null{
    const room = this.rooms.get(name);
    if(!room) return null;
    room.modelHash?.set(userName,modelHash);
    console.log(`Room join: ${room.name} ${userName}`);
    return room;
  }

  // 获取房间
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // 获取所有房间
  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // 删除房间
  deleteRoom(roomId: string): boolean {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);

      // 如果是学校房间，清理SchoolRoom实例
      if (room?.schoolRoom) {
        room.schoolRoom.destroy();
        console.log(`🏫 School room instance destroyed for room ${roomId}`);
      }

      this.rooms.delete(roomId);
      console.log(`Room deleted: ${roomId}`);
      return true;
    }
    return false;
  }

  // 添加参与者到房间
  addPeer(roomId: string, peerId: string, socketId: string, name: string): Peer | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const peer: Peer = {
      id: peerId,
      socketId,
      name: name || `Peer ${peerId.substring(0, 8)}`,
      joinedAt: new Date(),
      lastActivity: new Date(),
      transports: [],
      producers: [],
      consumers: [],
      dataProducers: [],
      dataConsumers: []
    };

    room.peers.set(peerId, peer);
    console.log(`Peer ${peer.name} (${peerId}) joined room ${roomId}`);
    return peer;
  }

  // 从房间移除参与者
  removePeer(roomId: string, peerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (room.peers.has(peerId)) {
      const peer = room.peers.get(peerId);
      room.peers.delete(peerId);
      console.log(`Peer ${peer?.name} (${peerId}) left room ${roomId}`);
      
      // 如果房间为空，删除房间
      if (room.peers.size === 0) {
        this.deleteRoom(roomId);
        console.log(`Room ${roomId} deleted because it's empty`);
      }
      
      return true;
    }
    return false;
  }

  // 获取参与者
  getPeer(roomId: string, peerId: string): Peer | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }
    return room.peers.get(peerId);
  }

  // 获取房间内所有参与者
  getPeers(roomId: string): Peer[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.peers.values());
  }

  // 设置参与者RTP能力
  setPeerRtpCapabilities(roomId: string, peerId: string, rtpCapabilities: any): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.rtpCapabilities = rtpCapabilities;
    return true;
  }

  // 添加参与者Transport
  addPeerTransport(roomId: string, peerId: string, transportId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.transports.push(transportId);
    return true;
  }

  // 添加参与者Producer
  addPeerProducer(roomId: string, peerId: string, producerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.producers.push(producerId);
    peer.lastActivity = new Date();
    return true;
  }

  // 添加参与者Consumer
  addPeerConsumer(roomId: string, peerId: string, consumerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.consumers.push(consumerId);
    return true;
  }

  // 从参与者移除Producer
  removePeerProducer(roomId: string, peerId: string, producerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    const index = peer.producers.indexOf(producerId);
    if (index !== -1) {
      peer.producers.splice(index, 1);
      return true;
    }
    return false;
  }

  // 从参与者移除Consumer
  removePeerConsumer(roomId: string, peerId: string, consumerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    const index = peer.consumers.indexOf(consumerId);
    if (index !== -1) {
      peer.consumers.splice(index, 1);
      return true;
    }
    return false;
  }

  // 添加参与者DataProducer
  addPeerDataProducer(roomId: string, peerId: string, dataProducerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.dataProducers.push(dataProducerId);
    peer.lastActivity = new Date();
    return true;
  }

  // 添加参与者DataConsumer
  addPeerDataConsumer(roomId: string, peerId: string, dataConsumerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.dataConsumers.push(dataConsumerId);
    return true;
  }

  // 从参与者移除DataProducer
  removePeerDataProducer(roomId: string, peerId: string, dataProducerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    const index = peer.dataProducers.indexOf(dataProducerId);
    if (index !== -1) {
      peer.dataProducers.splice(index, 1);
      return true;
    }
    return false;
  }

  // 从参与者移除DataConsumer
  removePeerDataConsumer(roomId: string, peerId: string, dataConsumerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    const index = peer.dataConsumers.indexOf(dataConsumerId);
    if (index !== -1) {
      peer.dataConsumers.splice(index, 1);
      return true;
    }
    return false;
  }

  // 根据socketId获取参与者
  getPeerBySocketId(socketId: string): { roomId: string; peer: Peer } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      for (const peer of room.peers.values()) {
        if (peer.socketId === socketId) {
          return { roomId, peer };
        }
      }
    }
    return null;
  }

  // 更新参与者活动状态
  updatePeerActivity(roomId: string, peerId: string): boolean {
    const peer = this.getPeer(roomId, peerId);
    if (!peer) {
      return false;
    }
    peer.lastActivity = new Date();
    return true;
  }

  // 获取房间摘要信息
  getRoomSummary(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    return {
      id: room.id,
      name: room.name,
      createdAt: room.createdAt,
      numPeers: room.peers.size,
      peers: Array.from(room.peers.values()).map(peer => ({
        id: peer.id,
        name: peer.name,
        producers: peer.producers.length,
      })),
    };
  }

  // 获取所有房间摘要
  getAllRoomsSummary() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      createdAt: room.createdAt,
      numPeers: room.peers.size,
    }));
  }
}

// 导出单例
export const roomManager = new RoomManager(); 