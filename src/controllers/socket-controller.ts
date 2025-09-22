import { Socket, Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { mediasoupHandler } from '../lib/mediasoup';
import { roomManager } from '../lib/room';

// 处理Socket.IO连接
export const handleConnection = (socket: Socket, io: Server): void => {
  const { id } = socket;

  console.log(`Client connected [id=${id}]`);

  // 当客户端创建或加入房间
  socket.on('createOrJoin', async (data: {
    roomId?: string,
    name: string,
    roomConfig?: any,
    modelHash?: string
  }) => {
    try {
      const { roomId: providedRoomId, name, roomConfig, modelHash } = data;
      let room;
      let roomId = providedRoomId;

      // 如果没有提供roomId，创建新房间
      if (!roomId) {
        const roomName = roomConfig?.name || `${name}'s Room`;
        room = roomManager.createRoom(roomName, roomConfig, modelHash);
        roomId = room.id;
      } else {
        // 尝试加入现有房间
        room = roomManager.getRoom(roomId);
        if (!room) {
          // 房间不存在，返回错误
          socket.emit('error', {
            message: 'Room not found',
            code: 'ROOM_NOT_FOUND',
            details: `房间 ${roomId} 不存在或已被删除`
          });
          return;
        }
      }

      // 生成唯一的参与者ID
      const peerId = uuidv4();

      // 将客户端加入房间
      socket.join(roomId);

      // 添加参与者到房间
      const peer = roomManager.addPeer(roomId, peerId, socket.id, name);

      if (!peer) {
        socket.emit('error', { message: 'Failed to join room' });
        return;
      }

      // 通知客户端已加入房间
      socket.emit('joined', {
        roomId,
        peerId,
        roomConfig,
        modelHash,
        peers: roomManager.getPeers(roomId)
          .filter(p => p.id !== peerId)
          .map(p => ({
            id: p.id,
            name: p.name,
          })),
      });

      // 通知房间内其他客户端有新成员加入
      socket.to(roomId).emit('peerJoined', {
        peerId,
        name,
        modelHash,
      });

      console.log(`Peer ${name} (${peerId}) joined room ${roomId} with model ${modelHash}`);
    } catch (error) {
      console.error('Error in createOrJoin:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // 离开房间
  socket.on('leave', ({ roomId, peerId }: { roomId: string, peerId: string }) => {
    try {
      // 通知房间内其他客户端有成员离开（在移除之前通知）
      socket.to(roomId).emit('peerLeft', { peerId });

      // 从房间移除参与者（这可能会删除房间如果是最后一个成员）
      const success = roomManager.removePeer(roomId, peerId);

      if (success) {
        // 离开socket.io房间
        socket.leave(roomId);

        console.log(`Peer ${peerId} left room ${roomId}`);

        // 检查房间是否还存在（可能已被删除）
        const room = roomManager.getRoom(roomId);
        if (!room) {
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

  // 获取可用房间列表
  socket.on('getRooms', (callback) => {
    try {
      const rooms = roomManager.getAllRoomsSummary();
      callback({ rooms });
    } catch (error) {
      console.error('Error in getRooms:', error);
      callback({ error: 'Failed to get rooms' });
    }
  });

  // 在 socket-controller.ts 中添加

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

  // 处理断开连接
  socket.on('disconnect', () => {
    try {
      // 找到断开连接的peer
      const peerInfo = roomManager.getPeerBySocketId(socket.id);

      if (peerInfo) {
        const { roomId, peer } = peerInfo;

        // 通知房间内其他客户端peer离开（在移除之前通知）
        socket.to(roomId).emit('peerLeft', { peerId: peer.id });

        // 从房间移除peer（这可能会删除房间如果是最后一个成员）
        const removed = roomManager.removePeer(roomId, peer.id);

        if (removed) {
          console.log(`Peer ${peer.name} (${peer.id}) disconnected from room ${roomId}`);

          // 检查房间是否还存在（可能已被删除）
          const room = roomManager.getRoom(roomId);
          if (!room) {
            console.log(`Room ${roomId} was deleted because it became empty`);
          }
        }
      }

      console.log(`Client disconnected [id=${socket.id}]`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
}; 