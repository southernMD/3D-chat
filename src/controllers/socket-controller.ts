import { Socket, Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { mediasoupHandler } from '../lib/mediasoup';
import { Room, RoomConfig, roomManager } from '../lib/room';
import { AuthService } from '../services/AuthService';

// 扩展Socket接口以包含用户信息
interface AuthenticatedSocket extends Socket {
  userId?: number;
  userEmail?: string;
}

// 处理Socket.IO连接
export const handleConnection = (socket: AuthenticatedSocket, io: Server): void => {
  const { id } = socket;

  console.log(`Client connected [id=${id}]`);

  // 确保roomManager有IO实例的引用
  roomManager.setIO(io);

  // 处理用户认证
  socket.on('authenticate', async (data: { token: string }) => {
    try {
      const authService = new AuthService();
      const verifyResult = await authService.verifyToken(data.token);
      console.log("socket 用户认证",verifyResult.data);
      if (verifyResult.success && verifyResult.data) {
        socket.userId = verifyResult.data.userId;
        socket.userEmail = verifyResult.data.email;

        socket.emit('authenticated', {
          success: true,
          userId: socket.userId,
          message: '认证成功'
        });

        console.log(`🔐 用户认证成功: ${socket.userEmail}(${socket.userId}) - Socket: ${socket.id}`);
      } else {
        socket.emit('authenticated', {
          success: false,
          message: '认证失败'
        });
        console.log(`❌ 用户认证失败: Socket ${socket.id}`);
      }
    } catch (error) {
      console.error('Socket认证错误:', error);
      socket.emit('authenticated', {
        success: false,
        message: '认证过程中发生错误'
      });
    }
  });

  // 当客户端创建或加入房间
  socket.on('createOrJoin', async (data: {
    roomId?: string,
    userName: string,
    roomConfig: RoomConfig,
    modelHash: string
  }) => {
    try {
      const { roomId: providedRoomId, userName, roomConfig, modelHash } = data;
      let room:Room | null;
      let roomId = providedRoomId;

      // 生成唯一的参与者ID
      const peerId = uuidv4();

      // 如果没有提供roomId，创建新房间
      if (!roomId) {
        const roomName = roomConfig?.name || `${userName}'s Room`;
        room = roomManager.createRoom(roomName, roomConfig, modelHash,userName,peerId);
        roomId = room.id;
      } else {
        // 尝试加入现有房间
        room = roomManager.joinRoom(roomId, modelHash, userName)
        if (!room) {
          // 房间不存在，返回错误
          socket.emit('error', {
            message: 'Room not found',
            code: 'ROOM_NOT_FOUND',
            details: `房间 ${roomId} 不存在或已被删除`
          });
          return;
          ;
        }
      }


      // 将客户端加入房间
      socket.join(roomId);

      // 添加参与者到房间 (传递认证的用户ID)
      const peer = roomManager.addPeer(roomId, peerId, socket.id, userName, socket.userId);

      if (!peer) {
        socket.emit('error', { message: 'Failed to join room' });
        return;
      }
      //加入房间是不传roomConfig的所以roomConfig是null
      const endRoomCongig = roomManager.getRoom(roomId)?.config

      console.log(endRoomCongig,"endRoomCongig");
      

      // 通知客户端已加入房间
      socket.emit('joined', {
        roomId,
        peerId,
        roomConfig:endRoomCongig,
        modelHash,
        peers: roomManager.getPeers(roomId)
          .filter(p => p.id !== peerId)
          .map(p => ({
            id: p.id,
            name: p.name,
            modelHash: room.modelHash?.get(p.name) || 'default-model-hash', // 添加用户的模型hash
          })),
      });

      // 单独发送房间配置
      socket.emit('roomConfig', endRoomCongig);

      // 如果是学校房间，延迟同步已标记的鸡蛋状态给新用户
      // 延迟确保客户端有足够时间设置事件监听器
      if (room.schoolRoom) {
        room.schoolRoom!.syncEggStatesForNewUser(socket.id);
      }

      // 通知房间内其他客户端有新成员加入
      socket.to(roomId).emit('peerJoined', {
        peerId,
        userName,
        modelHash,
      });

      console.log(`Peer ${userName} (${peerId}) joined room ${roomId} with model ${modelHash}`);
    } catch (error) {
      console.error('Error in createOrJoin:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // 离开房间
  socket.on('leave', ({ roomId, peerId }: { roomId: string, peerId: string }) => {
    try {
      let newHost;
      const room = roomManager.getRoom(roomId);
      
      if(room && peerId === roomManager.getRoom(roomId)?.config?.hostId){
        const vls = room.peers.values();
        
        for (const peer of vls) {
          if (peer.id !== peerId) {   
            newHost = peer.id;
            break; 
          }
        }
      }
      // 通知房间内其他客户端有成员离开（在移除之前通知）
      socket.to(roomId).emit('peerLeave', { peerId,newHost });

      // 从房间移除参与者（这可能会删除房间如果是最后一个成员）
      const success = roomManager.removePeer(roomId, peerId,newHost);

      if (success) {
        // 离开socket.io房间
        socket.leave(roomId);

        console.log(`Peer ${peerId} left room ${roomId}`);

        // 检查房间是否还存在（可能已被删除）
        const roomAfter = roomManager.getRoom(roomId);
        if (!roomAfter) {
          console.log(`Room ${roomId} was deleted because it became empty`);
        }
      }
    } catch (error) {
      console.error('Error in leave:', error);
    }
  });

  // 获取Router的RTP能力
  socket.on('getRouterRtpCapabilities', async (dataOrCallback, callback) => {
    try {
      // 处理不同的调用方式
      const cb = typeof dataOrCallback === 'function' ? dataOrCallback : callback;
      
      if (typeof cb !== 'function') {
        console.error('No callback provided for getRouterRtpCapabilities');
        return;
      }
      
      const rtpCapabilities = mediasoupHandler.getRtpCapabilities();
      cb({ rtpCapabilities });
    } catch (error) {
      console.error('Error in getRouterRtpCapabilities:', error);
      
      // 处理不同的调用方式
      const cb = typeof dataOrCallback === 'function' ? dataOrCallback : callback;
      
      if (typeof cb === 'function') {
        cb({ error: 'Internal server error' });
      }
    }
  });

  // 创建WebRTC传输
  socket.on('createWebRtcTransport', async (data, callback) => {
    try {
      // 兼容不同调用方式
      let params, cb;
      if (typeof data === 'function') {
        cb = data;
        params = {};
      } else {
        cb = callback;
        params = data || {};
      }
      
      if (typeof cb !== 'function') {
        console.error('No callback provided for createWebRtcTransport');
        return;
      }
      
      const { roomId, peerId, consuming } = params;
      
      if (!roomId || !peerId) {
        cb({ error: 'Missing required parameters: roomId, peerId' });
        return;
      }
      
      const transport = await mediasoupHandler.createWebRtcTransport(roomId, peerId, consuming);

      // 将transport ID添加到peer
      roomManager.addPeerTransport(roomId, peerId, transport.id);

      cb(transport);
    } catch (error) {
      console.error('Error in createWebRtcTransport:', error);
      
      // 兼容不同调用方式
      const cb = typeof data === 'function' ? data : callback;
      
      if (typeof cb === 'function') {
        cb({ error: 'Failed to create WebRTC transport' });
      }
    }
  });

  // 连接WebRTC传输
  socket.on('connectWebRtcTransport', async (data, callback) => {
    try {
      // 兼容不同调用方式
      let params, cb;
      if (typeof data === 'function') {
        cb = data;
        params = {};
      } else {
        cb = callback;
        params = data || {};
      }
      
      if (typeof cb !== 'function') {
        console.error('No callback provided for connectWebRtcTransport');
        return;
      }
      
      const { roomId, peerId, transportId, dtlsParameters, isConsumer } = params;
      
      if (!roomId || !peerId || !transportId || !dtlsParameters) {
        cb({ error: 'Missing required parameters' });
        return;
      }
      
      const result = await mediasoupHandler.connectWebRtcTransport(
        roomId,
        peerId,
        transportId,
        dtlsParameters,
        isConsumer
      );
      cb(result);
    } catch (error) {
      console.error('Error in connectWebRtcTransport:', error);
      
      // 兼容不同调用方式
      const cb = typeof data === 'function' ? data : callback;
      
      if (typeof cb === 'function') {
        cb({ error: 'Failed to connect transport' });
      }
    }
  });

  // 创建Producer（发送媒体流）
  socket.on('produce', async ({ roomId, peerId, kind, rtpParameters, appData }, callback) => {
    try {
      const result = await mediasoupHandler.produce(roomId, peerId, kind, rtpParameters, appData);

      // 保存producer ID到peer
      roomManager.addPeerProducer(roomId, peerId, result.id);

      // 通知房间内其他客户端有新的producer
      socket.to(roomId).emit('newProducer', {
        producerId: result.id,
        producerPeerId: peerId,
        kind,
      });

      callback(result);
    } catch (error) {
      console.error('Error in produce:', error);
      callback({ error: 'Failed to create producer' });
    }
  });

  // 创建Consumer（接收媒体流）
  socket.on('consume', async ({ roomId, consumerPeerId, producerId, rtpCapabilities }, callback) => {
    try {
      
      // 保存消费者的RTP能力
      roomManager.setPeerRtpCapabilities(roomId, consumerPeerId, rtpCapabilities);

      const consumer = await mediasoupHandler.consume(roomId, consumerPeerId, producerId, rtpCapabilities);

      // 保存consumer ID到peer
      roomManager.addPeerConsumer(roomId, consumerPeerId, consumer.id);

      callback(consumer);
    } catch (error) {
      console.error('Error in consume:', error);
      callback({ error: 'Failed to create consumer' });
    }
  });

  // 恢复Consumer
  socket.on('resumeConsumer', async ({ consumerId }, callback) => {
    try {
      const result = await mediasoupHandler.resumeConsumer(consumerId);
      callback(result);
    } catch (error) {
      console.error('Error in resumeConsumer:', error);
      callback({ error: 'Failed to resume consumer' });
    }
  });

  // 关闭Producer
  socket.on('closeProducer', async ({ roomId, peerId, producerId }, callback) => {
    try {
      await mediasoupHandler.closeProducer(producerId);

      // 从peer移除producer
      roomManager.removePeerProducer(roomId, peerId, producerId);

      // 通知房间内其他客户端producer已关闭
      socket.to(roomId).emit('producerClosed', {
        producerId,
        producerPeerId: peerId,
      });

      callback({ closed: true });
    } catch (error) {
      console.error('Error in closeProducer:', error);
      callback({ error: 'Failed to close producer' });
    }
  });

  // 获取房间内的生产者列表
  socket.on('getProducers', async (data, callback) => {
    try {
      // 兼容不同调用方式
      let params, cb;
      if (typeof data === 'function') {
        cb = data;
        params = {};
      } else {
        cb = callback;
        params = data || {};
      }
      
      if (typeof cb !== 'function') {
        console.error('No callback provided for getProducers');
        return;
      }
      
      const { roomId, peerId } = params;
      
      if (!roomId || !peerId) {
        cb({ error: 'Missing required parameters: roomId, peerId' });
        return;
      }
      
      const peers = roomManager.getPeers(roomId).filter(p => p.id !== peerId);

      const producers = [];
      for (const peer of peers) {
        // 添加媒体生产者
        for (const producerId of peer.producers) {
          // 从mediasoup获取生产者信息以确定类型
          const producerInfo = mediasoupHandler.getProducer(producerId);
          producers.push({
            producerId,
            producerPeerId: peer.id,
            producerPeerName: peer.name,
            kind: producerInfo?.kind || 'unknown',
            type: 'media'
          });
        }

        // 添加数据生产者
        for (const dataProducerId of peer.dataProducers) {
          producers.push({
            producerId: dataProducerId,
            producerPeerId: peer.id,
            producerPeerName: peer.name,
            kind: 'data',
            type: 'data'
          });
        }
      }

      cb({ producers });
    } catch (error) {
      console.error('Error in getProducers:', error);
      
      // 兼容不同调用方式
      const cb = typeof data === 'function' ? data : callback;
      
      if (typeof cb === 'function') {
        cb({ error: 'Failed to get producers' });
      }
    }
  });

  // 获取所有房间详细数据（包括私密房间）
  socket.on('getRooms', (callback) => {
    try {
      const roomsMap = roomManager.getAllRooms();
      const rooms = Array.from(roomsMap.values());
      if (typeof callback === 'function') {
        callback({ rooms });
      } else {
        socket.emit('roomsData', rooms);
      }
    } catch (error) {
      if (typeof callback === 'function') {
        callback({ error: 'Failed to get rooms' });
      } else {
        socket.emit('roomsData', []);
      }
    }
  });

  // 房间增删时主动推送最新房间列表（你可以在 createRoom/deleteRoom 后调用 io.emit('roomsUpdate', rooms)）
  // 这里只给出示例，具体调用时机请在房间创建/删除逻辑中补充：
  // io.emit('roomsUpdate', Array.from(roomManager.getAllRooms().values()));

  // 创建 DataProducer
  socket.on('produceData', async (data, callback) => {
    try {
      // 兼容不同调用方式
      let params, cb;
      if (typeof data === 'function') {
        cb = data;
        params = {};
      } else {
        cb = callback;
        params = data || {};
      }
      
      if (typeof cb !== 'function') {
        console.error('No callback provided for produceData');
        return;
      }
      
      const { roomId, peerId, label, protocol, appData, sctpStreamParameters } = params;
      
      if (!roomId || !peerId) {
        cb({ error: 'Missing required parameters: roomId, peerId' });
        return;
      }

      console.log('Producing data with params:', { roomId, peerId, label, protocol, sctpStreamParameters });
      
      const result = await mediasoupHandler.createDataProducer(roomId, peerId, label || 'chat', protocol || 'simple-chat', appData || {},sctpStreamParameters);
      
      
      // 保存 dataProducer ID 到 peer
      roomManager.addPeerDataProducer(roomId, peerId, result.id);

      // 通知房间内其他客户端有新的 dataProducer
      socket.to(roomId).emit('newDataProducer', {
        dataProducerId: result.id,
        producerPeerId: peerId,
        label: result.label,
        protocol: result.protocol
      });

      cb(result);
    } catch (error) {
      console.error('Error in produceData:', error);
      
      // 兼容不同调用方式
      const cb = typeof data === 'function' ? data : callback;
      
      if (typeof cb === 'function') {
        cb({ error: 'Failed to create data producer' });
      }
    }
  });

  // 消费 DataProducer
  socket.on('consumeData', async (data, callback) => {
    try {
      // 兼容不同调用方式
      let params, cb;
      if (typeof data === 'function') {
        cb = data;
        params = {};
      } else {
        cb = callback;
        params = data || {};
      }
      
      if (typeof cb !== 'function') {
        console.error('No callback provided for consumeData');
        return;
      }
      
      const { roomId, consumerPeerId, dataProducerId } = params;
      
      if (!roomId || !consumerPeerId || !dataProducerId) {
        cb({ error: 'Missing required parameters' });
        return;
      }
      
      const result = await mediasoupHandler.createDataConsumer(roomId, consumerPeerId, dataProducerId);
      
      // 保存 dataConsumer ID 到 peer
      roomManager.addPeerDataConsumer(roomId, consumerPeerId, result.id);
      
      cb(result);
    } catch (error) {
      console.error('Error in consumeData:', error);
      
      // 兼容不同调用方式
      const cb = typeof data === 'function' ? data : callback;
      
      if (typeof cb === 'function') {
        cb({ error: 'Failed to create data consumer' });
      }
    }
  });
  
  // 关闭 DataProducer
  socket.on('closeDataProducer', async ({ roomId, peerId, dataProducerId }, callback) => {
    try {
      await mediasoupHandler.closeDataProducer(dataProducerId);
      
      // 从 peer 移除 dataProducer
      roomManager.removePeerDataProducer(roomId, peerId, dataProducerId);
      
      // 通知房间内其他客户端 dataProducer 已关闭
      socket.to(roomId).emit('dataProducerClosed', {
        dataProducerId,
        producerPeerId: peerId,
      });
      
      callback({ closed: true });
    } catch (error) {
      console.error('Error in closeDataProducer:', error);
      callback({ error: 'Failed to close data producer' });
    }
  });

  // 处理清除鸡蛋标记事件（学校房间专用）
  socket.on('clearEgg', ({ id, eggId, username, roomId }: {
    id: number,
    eggId: string,
    username: string,
    roomId: string
  }, callback) => {
    try {
      console.log(`🥚 收到清除鸡蛋请求: eggId=${eggId}, playerId=${id}, username=${username}, roomId=${roomId}`);

      // 获取房间信息
      const room = roomManager.getRoom(roomId);
      if (!room) {
        const error = `房间 ${roomId} 不存在`;
        console.error(`❌ ${error}`);
        if (callback) callback({ success: false, error });
        return;
      }

      // 检查是否是学校房间
      if (!room.schoolRoom) {
        const error = `房间 ${roomId} 不是学校房间`;
        console.error(`❌ ${error}`);
        if (callback) callback({ success: false, error });
        return;
      }

      // 验证用户是否在对应房间内
      const peer = room.peers.get(id.toString());
      if (!peer) {
        const error = `用户 ${username}(${id}) 不在房间 ${roomId} 内`;
        console.error(`❌ ${error}`);

        // 通知客户端重新插入鸡蛋（用户不在房间内，可能是非法操作）
        socket.emit('reinsertEgg', {
          eggId: eggId,
          reason: 'USER_NOT_IN_ROOM',
          message: '用户不在对应房间内',
          position: null
        });

        if (callback) callback({ success: false, error, shouldReinsert: true });
        return;
      }

      // 验证用户的socket连接是否匹配
      if (peer.socketId !== socket.id) {
        const error = `用户 ${username}(${id}) 的socket连接不匹配`;
        console.error(`❌ ${error}`);

        // 通知客户端重新插入鸡蛋（socket不匹配，可能是非法操作）
        socket.emit('reinsertEgg', {
          eggId: eggId,
          reason: 'SOCKET_MISMATCH',
          message: 'Socket连接不匹配',
          position: null
        });

        if (callback) callback({ success: false, error, shouldReinsert: true });
        return;
      }

      // 调用学校房间的处理方法
      room.schoolRoom.handleClearEgg(socket, { id, eggId, username, roomId }, callback, roomManager);

    } catch (error) {
      console.error('❌ 处理清除鸡蛋事件时发生错误:', error);

      // 发生异常时通知客户端重新插入鸡蛋
      socket.emit('reinsertEgg', {
        eggId: eggId,
        reason: 'SERVER_ERROR',
        message: '服务器处理错误',
        position: null
      });

      if (callback) callback({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        shouldReinsert: true
      });
    }
  });

  // 处理获取用户装备事件
  socket.on('getUserEquipment', ({ roomId, peerId }: { roomId: string, peerId: string }) => {
    try {
      console.log(`📦 获取用户装备请求: roomId=${roomId}, peerId=${peerId}`);

      const userEquipment = roomManager.getUserEquipment(roomId, peerId);
      if (userEquipment) {
        socket.emit('userEquipment', {
          success: true,
          data: userEquipment
        });
        console.log(`✅ 用户装备已发送: ${userEquipment.username}`);
      } else {
        socket.emit('userEquipment', {
          success: false,
          message: '用户装备不存在'
        });
        console.log(`❌ 用户装备不存在: ${peerId}`);
      }
    } catch (error) {
      console.error('❌ 获取用户装备时发生错误:', error);
      socket.emit('userEquipment', {
        success: false,
        message: '获取装备失败'
      });
    }
  });

  // 处理修改鸡蛋数量事件（统一处理增减和设置）
  socket.on('modifyEggQuantity', ({
    roomId,
    peerId,
    change
  }: {
    roomId: string,
    peerId: string,
    change: number
  }) => {
    try {
      if (change > 0) {
        console.log(`➕ 增加鸡蛋: ${peerId} +${change}`);
      } else if (change < 0) {
        console.log(`➖ 减少鸡蛋: ${peerId} ${change}`);
      } else {
        console.log(`🔄 鸡蛋数量不变: ${peerId}`);
      }

      const success = roomManager.modifyUserEggQuantity(roomId, peerId, change);

      // 获取更新后的数量
      const room = roomManager.getRoom(roomId);
      const updatedEquipment = room?.userEquipments.get(peerId);
      const newQuantity = updatedEquipment?.egg || 0;

      socket.emit('eggQuantityChanged', {
        success,
        quantity: newQuantity,
        message: success ? '鸡蛋数量修改成功' : '鸡蛋数量修改失败'
      });

    } catch (error) {
      console.error('❌ 修改鸡蛋数量时发生错误:', error);
      socket.emit('eggQuantityChanged', {
        success: false,
        quantity: 0,
        message: '修改鸡蛋数量失败'
      });
    }
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    try {
      // 找到断开连接的peer
      const peerInfo = roomManager.getPeerBySocketId(socket.id);

      if (peerInfo) {
        const { roomId, peer } = peerInfo;

        let newHost;
        const room = roomManager.getRoom(roomId);
        if(room && peer.id === roomManager.getRoom(roomId)?.config?.hostId){
          const vls = room.peers.values();
          
          for (const peer of vls) {
            if (peer.id !== peer.id) {   
              newHost = peer.id;
              break; 
            }
          }
        }
        // 通知房间内其他客户端peer离开（在移除之前通知）
        socket.to(roomId).emit('peerLeave', { peerId: peer.id,newHost });

        // 从房间移除peer（这可能会删除房间如果是最后一个成员）
        const removed = roomManager.removePeer(roomId, peer.id,newHost);

        if (removed) {
          console.log(`Peer ${peer.name} (${peer.id}) disconnected from room ${roomId}`);

          // 检查房间是否还存在（可能已被删除）
          const roomAfter = roomManager.getRoom(roomId);
          if (!roomAfter) {
            console.log(`Room ${roomId} was deleted because it became empty`);
          }
        }
      }

      console.log(`Client disconnected [id=${socket.id}]`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });

  //麦克风的ui同步函数
  socket.on("change-mico-status", ({ roomId, peerId }) => {
    socket.to(roomId).emit("change-mico-status", { peerId, status: false });
  });

  socket.on('updateRoomConfig',({roomId,peerId,config:roomConfig},callback)=>{
    const oldRoom = roomManager.getRoom(roomId)
    if(!oldRoom || oldRoom.config?.hostId !== peerId)callback({success:false,message:'你不是房主'})
    if((oldRoom?.peers.size ?? 0) > (+(roomConfig as RoomConfig).maxUsers))callback({success:false,message:'超过最大允许人数'})
  
    const success = roomManager.updateRoomConfig(roomId,roomConfig)
    if(success){
      callback({success:true,message:"更新信息成功"})
      io.to(roomId).emit('roomConfig',roomConfig)
    }else{
      callback({success:false,message:"更新信息失败"})
    }
    
  })
}; 