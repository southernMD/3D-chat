import { v4 as uuidv4 } from 'uuid';
import { SchoolRoom } from './shcoolRoom';
import { Server } from 'socket.io';
import { equipmentManager } from './equipmentManager';
import { logger } from './logger';

// 参与者类型定义
export interface Peer {
  id: string;
  socketId: string;
  name: string;
  userId?: number; // 用户在数据库中的真实ID
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
  password?:string
  enableVoice: boolean;
  enableText: boolean;
  map: RoomType;
  hostId:string
}

// 用户装备接口 (基于实际的Equipment实体)
export interface UserEquipment {
  id: number;        // 用户ID
  username: string;  // 用户名
  egg: number;       // 鸡蛋数量
  lastUpdated: Date; // 最后更新时间
}

// 房间类型定义
export interface Room {
  id: string;
  createdAt: Date;
  peers: Map<string, Peer>;
  config?: RoomConfig;
  modelHash?: Map<string, string>;
  schoolRoom?: SchoolRoom; // 学校房间实例（仅当房间类型为school时存在）
  userEquipments: Map<string, UserEquipment>; // 房间内用户装备列表
}

// 房间管理类
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server | null = null;

  // 新增：暴露 rooms 的只读访问
  public getAllRooms(): Map<string, Room> {
    return this.rooms;
  }

  // 设置Socket.IO实例
  setIO(io: Server): void {
    this.io = io;
  }



  // 创建房间
  createRoom(name: string, config: RoomConfig, modelHash: string, userName: string,peerId:string): Room {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      createdAt: new Date(),
      peers: new Map(),
      config:{
        ...config,
        hostId:peerId
      },
      modelHash: new Map([[userName, modelHash]]),
      userEquipments: new Map(), // 初始化用户装备列表
    };
    console.log(config?.map,"地图是");
    
    // 如果是学校类型房间，创建SchoolRoom实例
    if (config?.map === RoomType.SCHOOL && this.io) {
      room.schoolRoom = new SchoolRoom(roomId, this.io);
      room.schoolRoom.startBroadcast();
      console.log(`🏫 School room features enabled for room ${roomId}`);
    }

    this.rooms.set(roomId, room);
    console.log(`Room created: ${room.config?.name} (${roomId})${modelHash ? ` with model ${modelHash}` : ''}`);


    return room;
  }

  //加入房间
  joinRoom(name: string, modelHash: string,userName:string): Room | null{
    const room = this.rooms.get(name);
    if(!room) return null;
    room.modelHash?.set(userName,modelHash);
    console.log(`Room join: ${room.config?.name} ${userName}`);
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

  // 获取用户装备
  getUserEquipment(roomId: string, peerId: string): UserEquipment | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }
    return room.userEquipments.get(peerId);
  }

  // 修改用户鸡蛋数量（正数增加，负数减少）
  modifyUserEggQuantity(roomId: string, peerId: string, change: number): boolean {
    const userEquipment = this.getUserEquipment(roomId, peerId);
    if (!userEquipment) {
      console.error(`❌ 用户装备不存在: ${peerId} in room ${roomId}`);
      return false;
    }

    return equipmentManager.modifyEggQuantity(userEquipment, change);
  }

  // 从用户移除鸡蛋
  removeEggsFromUser(roomId: string, peerId: string, quantity: number): boolean {
    const userEquipment = this.getUserEquipment(roomId, peerId);
    if (!userEquipment) {
      console.error(`❌ 用户装备不存在: ${peerId} in room ${roomId}`);
      return false;
    }

    return equipmentManager.removeEggs(userEquipment, quantity);
  }

  // 获取房间内所有用户装备
  getRoomEquipments(roomId: string): Map<string, UserEquipment> | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }
    return room.userEquipments;
  }

  // 删除房间
  deleteRoom(roomId: string): boolean {
    if (this.rooms.has(roomId)) {
      const room = this.rooms.get(roomId);

      // 保存房间内所有用户装备
      if (room && room.userEquipments.size > 0) {
        this.saveAllRoomEquipmentsAsync(roomId, room.userEquipments);
      }

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

  // 异步保存房间内所有用户装备
  private async saveAllRoomEquipmentsAsync(roomId: string, userEquipments: Map<string, UserEquipment>): Promise<void> {
    try {
      console.log(`🏠 房间删除时保存所有用户装备: ${roomId}`);
      await equipmentManager.saveRoomEquipments(userEquipments, roomId);
    } catch (error) {
      console.error(`❌ 保存房间装备失败: ${roomId}`, error);
    }
  }

  // 添加参与者到房间
  addPeer(roomId: string, peerId: string, socketId: string, name: string, userId?: number): Peer | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const peer: Peer = {
      id: peerId,
      socketId,
      name: name || `Peer ${peerId.substring(0, 8)}`,
      userId, // 用户数据库ID
      joinedAt: new Date(),
      lastActivity: new Date(),
      transports: [],
      producers: [],
      consumers: [],
      dataProducers: [],
      dataConsumers: []
    };

    room.peers.set(peerId, peer);

    // 异步加载用户装备 (使用真实的用户ID)
    if (userId) {
      this.loadUserEquipmentAsync(roomId, peerId, name, userId);
    } else {
      console.warn(`⚠️ 用户 ${name}(${peerId}) 没有提供数据库ID，跳过装备加载`);
    }

    console.log(`Peer ${peer.name} (${peerId}) joined room ${roomId}`);
    return peer;
  }

  // 异步加载用户装备
  private async loadUserEquipmentAsync(roomId: string, peerId: string, name: string, userId: number): Promise<void> {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`❌ 房间 ${roomId} 不存在，无法加载用户装备`);
        return;
      }

      // 从数据库加载用户装备 (使用真实的用户ID)
      const userEquipment = await equipmentManager.loadUserEquipment(userId.toString(), name);

      // 将装备添加到房间的装备列表中 (使用peerId作为key)
      room.userEquipments.set(peerId, userEquipment);

      console.log(`📦 用户装备已加载到房间: ${name}(userId:${userId}, peerId:${peerId}) -> ${roomId}`);
    } catch (error) {
      console.error(`❌ 加载用户装备失败: ${name}(userId:${userId}, peerId:${peerId})`, error);
    }
  }

  // 从房间移除参与者
  removePeer(roomId: string, peerId: string,newHost?:string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (room.peers.has(peerId)) {
      const peer = room.peers.get(peerId);

      // 异步保存用户装备
      this.saveUserEquipmentAsync(roomId, peerId);

      room.peers.delete(peerId);
      console.log(`Peer ${peer?.name} (${peerId}) left room ${roomId}`);

      // 如果房间为空，删除房间
      if (room.peers.size === 0) {
        this.deleteRoom(roomId);
        console.log(`Room ${roomId} deleted because it's empty`);
      }else if(newHost){
        room.config!.hostId = newHost
      }

      return true;
    }
    return false;
  }

  // 异步保存用户装备
  private async saveUserEquipmentAsync(roomId: string, peerId: string): Promise<void> {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`❌ 房间 ${roomId} 不存在，无法保存用户装备`);
        return;
      }

      const userEquipment = room.userEquipments.get(peerId);
      if (userEquipment) {
        // 保存用户装备到数据库
        await equipmentManager.saveUserEquipment(userEquipment);

        // 从房间装备列表中移除
        room.userEquipments.delete(peerId);

        console.log(`💾 用户装备已保存并从房间移除: ${userEquipment.username}(${peerId})`);
      }
    } catch (error) {
      console.error(`❌ 保存用户装备失败: ${peerId}`, error);
    }
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
      name: room.config?.name,
      createdAt: room.createdAt,
      numPeers: room.peers.size,
    }));
  }

  //更新房间配置
  updateRoomConfig(roomId:string,roomConfig:RoomConfig){
    try {
      const oldRoom =this.rooms.get(roomId)
      oldRoom!.config = { ...oldRoom?.config,...roomConfig }
      this.rooms.set(roomId,oldRoom!)
      return true
    } catch (error:any) {
      logger.error(error.message)
      return false
    }
  }
}

// 导出单例
export const roomManager = new RoomManager(); 