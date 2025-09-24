import { Server } from 'socket.io';
import { eggPosition } from '../utils/eggPositions';

// 彩蛋位置接口
export interface EggPosition {
  x: string;
  y: string;
  z: string;
  id?: string;
  isMarked?: boolean;
}

// 学校房间类
export class SchoolRoom {
  private roomId: string;
  private io: Server;
  private eggPositions: EggPosition[];
  private broadcastInterval: NodeJS.Timeout | null = null;
  private readonly BROADCAST_INTERVAL = 10000; // 30秒广播一次
  private readonly MAX_EGGS_PER_BROADCAST = 10; // 每次最多广播3个彩蛋

  constructor(roomId: string, io: Server) {
    this.roomId = roomId;
    this.io = io;

    // 初始化彩蛋位置，添加唯一ID和标记状态
    this.eggPositions = eggPosition.map((pos, index) => ({
      ...pos,
      id: `egg_${index}_${Date.now()}`,
      isMarked: false,
    }));

    console.log(`🏫 SchoolRoom initialized for room ${roomId} with ${this.eggPositions.length} egg positions`);
  }

  /**
   * 处理清除鸡蛋事件
   */
  public handleClearEgg(
    socket: any,
    { id, eggId, username, roomId }: { id: number, eggId: string, username: string, roomId: string },
    callback?: (response: any) => void
  ): void {
    try {
      console.log(`🥚 收到清除鸡蛋请求: eggId=${eggId}, playerId=${id}, username=${username}, roomId=${roomId}`);

      // 查找对应的鸡蛋
      const egg = this.eggPositions.find(egg => egg.id === eggId);
      if (!egg) {
        console.log(`❌ Egg ${eggId} not found in room ${this.roomId}`);

        // 通知客户端重新插入彩蛋
        socket.emit('reinsertEgg', {
          eggId: eggId,
          reason: 'EGG_NOT_FOUND',
          message: '鸡蛋不存在',
          position: null
        });

        if (callback) callback({ success: false, error: '鸡蛋不存在', shouldReinsert: true });
        return;
      }

      if (!egg.isMarked) {
        console.log(`⚠️ Egg ${eggId} is not marked in room ${this.roomId}`);

        // 通知客户端重新插入彩蛋，并返回具体位置
        socket.emit('reinsertEgg', {
          eggId: eggId,
          reason: 'EGG_NOT_MARKED',
          message: '鸡蛋未被标记',
          position: {
            id: egg.id,
            x: parseFloat(egg.x),
            y: parseFloat(egg.y),
            z: parseFloat(egg.z)
          }
        });

        if (callback) callback({ success: false, error: '鸡蛋未被标记', shouldReinsert: true });
        return;
      }

      // 清除标记
      egg.isMarked = false;

      // 广播彩蛋被清除的消息
      this.io.to(this.roomId).emit('eggCleared', {
        eggId: eggId,
        clearedBy: id.toString(),
        timestamp: new Date(),
        remainingEggs: this.eggPositions.filter(egg => !egg.isMarked).length
      });

      // 通知客户端成功获得彩蛋
      socket.emit('eggCollected', {
        eggId: eggId,
        playerId: id,
        username: username,
        timestamp: new Date(),
        message: '恭喜你获得了彩蛋！'
      });

      console.log(`✅ Egg ${eggId} cleared by player ${username}(${id}) in room ${this.roomId}`);

      if (callback) callback({ success: true, collected: true });

    } catch (error) {
      console.error('❌ 处理清除鸡蛋事件时发生错误:', error);

      // 发生异常时通知客户端重新插入彩蛋
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
  }

  /**
   * 启动周期性广播
   */
  public startBroadcast(): void {
    if (this.broadcastInterval) {
      console.log(`⚠️ Broadcast already running for room ${this.roomId}`);
      return;
    }

    console.log(`🚀 Starting egg broadcast for school room ${this.roomId}`);

    // 立即广播一次
    this.broadcastEggs();

    // 设置周期性广播
    this.broadcastInterval = setInterval(() => {
      this.broadcastEggs();
    }, this.BROADCAST_INTERVAL);
  }

  /**
   * 停止周期性广播
   */
  public stopBroadcast(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
      console.log(`🛑 Stopped egg broadcast for school room ${this.roomId}`);
    }
  }

  /**
   * 广播彩蛋位置
   */
  private broadcastEggs(): void {
    // 获取未标记的彩蛋位置
    const unmarkedEggs = this.eggPositions.filter(egg => !egg.isMarked);

    if (unmarkedEggs.length === 0) {
      console.log(`📍 No unmarked eggs available in room ${this.roomId}`);
      return;
    }

    // 随机选择要广播的彩蛋数量（不超过最大值和可用数量）
    const eggCount = Math.min(
      this.MAX_EGGS_PER_BROADCAST,
      unmarkedEggs.length,
      Math.floor(Math.random() * this.MAX_EGGS_PER_BROADCAST) + 1
    );

    // 随机选择彩蛋
    const selectedEggs: EggPosition[] = [];
    const availableEggs = [...unmarkedEggs];

    for (let i = 0; i < eggCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableEggs.length);
      const selectedEgg = availableEggs.splice(randomIndex, 1)[0];

      // 标记为已广播
      selectedEgg.isMarked = true;

      selectedEggs.push(selectedEgg);
    }

    // 广播到房间内的所有客户端
    this.io.to(this.roomId).emit('eggBroadcast', {
      eggs: selectedEggs.map(egg => ({
        id: egg.id,
        x: parseFloat(egg.x),
        y: parseFloat(egg.y),
        z: parseFloat(egg.z),
      })),
      roomId: this.roomId,
      totalEggs: selectedEggs.length,
      remainingEggs: this.eggPositions.filter(egg => !egg.isMarked).length
    });

    console.log(`🥚 Broadcasted ${selectedEggs.length} eggs to room ${this.roomId}, ${this.eggPositions.filter(egg => !egg.isMarked).length} eggs remaining`);
  }

  /**
   * 同步所有已标记的彩蛋状态给新加入的用户
   */
  public syncEggStatesForNewUser(socketId: string): void {
    // 获取所有已标记的彩蛋
    const markedEggs = this.eggPositions.filter(egg => egg.isMarked);

    if (markedEggs.length === 0) {
      console.log(`📍 No marked eggs to sync for new user in room ${this.roomId}`);
      return;
    }

    // 发送已标记的彩蛋状态给新用户
    this.io.to(socketId).emit('eggBroadcast', {
      eggs: markedEggs.map(egg => ({
        id: egg.id,
        x: parseFloat(egg.x),
        y: parseFloat(egg.y),
        z: parseFloat(egg.z),
      })),
      roomId: this.roomId,
      totalEggs: markedEggs.length,
      remainingEggs: this.eggPositions.filter(egg => !egg.isMarked).length,
      isSync: true // 标识这是同步消息
    });

    console.log(`🔄 Synced ${markedEggs.length} marked eggs to new user in room ${this.roomId}`);
  }

  /**
   * 客户端消除彩蛋标记
   */
  public clearEggMark(eggId: string, playerId: string): boolean {
    const egg = this.eggPositions.find(egg => egg.id === eggId);

    if (!egg) {
      console.log(`❌ Egg ${eggId} not found in room ${this.roomId}`);
      return false;
    }

    if (!egg.isMarked) {
      console.log(`⚠️ Egg ${eggId} is not marked in room ${this.roomId}`);
      return false;
    }

    // 清除标记
    egg.isMarked = false;

    // 广播彩蛋被清除的消息
    this.io.to(this.roomId).emit('eggCleared', {
      eggId: eggId,
      clearedBy: playerId,
      timestamp: new Date(),
      remainingEggs: this.eggPositions.filter(egg => !egg.isMarked).length
    });

    console.log(`✅ Egg ${eggId} cleared by player ${playerId} in room ${this.roomId}`);
    return true;
  }

//   /**
//    * 获取房间统计信息
//    */
//   public getStats(): {
//     totalEggs: number;
//     markedEggs: number;
//     unmarkedEggs: number;
//     isActive: boolean;
//   } {
//     const markedEggs = this.eggPositions.filter(egg => egg.isMarked).length;

//     return {
//       totalEggs: this.eggPositions.length,
//       markedEggs: markedEggs,
//       unmarkedEggs: this.eggPositions.length - markedEggs,
//       isActive: this.broadcastInterval !== null
//     };
//   }

//   /**
//    * 重置所有彩蛋标记（管理员功能）
//    */
//   public resetAllEggs(): void {
//     this.eggPositions.forEach(egg => {
//       egg.isMarked = false;
//     });

//     // 广播重置消息
//     this.io.to(this.roomId).emit('eggsReset', {
//       roomId: this.roomId,
//       timestamp: new Date(),
//       totalEggs: this.eggPositions.length
//     });

//     console.log(`🔄 All eggs reset in school room ${this.roomId}`);
//   }

  /**
   * 销毁房间实例
   */
  public destroy(): void {
    this.stopBroadcast();
    console.log(`💥 SchoolRoom ${this.roomId} destroyed`);
  }
}