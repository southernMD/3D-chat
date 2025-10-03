import { Router, Request, Response } from 'express';
import { roomManager } from '../lib/room';
import { mediasoupHandler } from '../lib/mediasoup';
import { logger } from '../lib/logger';

const router = Router();

// 获取服务器状态
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = {
      mediasoup: {
        workers: mediasoupHandler.getWorkersCount(),
      },
      rooms: roomManager.getAllRoomsSummary(),
    };

    res.json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    logger.error((error as any).toString())
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// 获取所有房间（详细数据，包括私密房间）
router.get('/rooms', (req: Request, res: Response) => {
  try {
    // 直接返回所有房间详细数据
    const roomsMap = roomManager.getAllRooms();
    // Map 转为数组，包含所有 Room 对象

    const rooms = Array.from(roomsMap.values()).map((item) => {
      return {
        id: item.id,
        createdAt: item.createdAt,
        config: item.config,
        onlineNumber: item.peers.size
      }
    });
    res.json({
      success: true,
      data: { rooms },
    });
  } catch (error: any) {
    logger.error((error as any).toString())
    res.status(500).json({
      success: false,
      error: error.message || '获取所有房间失败',
      data: undefined,
      message: error.message || '获取所有房间失败',
    });
  }
});

// 检查房间是否存在
router.get<{ roomId: string }>('/rooms/:roomId/exists', (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      res.json({
        success: true,
        data: {
          exists: false
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        exists: true
      },
    });
  } catch (error: any) {
    logger.error((error as any).toString())
    res.status(500).json({
      success: false,
      error: error.message || '检测房间失败',
      data: undefined,
      message: error.message || '检测房间失败',
    });
  }
});

// 检查房间是否存在密码
router.get<{ roomId: string }>('/rooms/:roomId/password', (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomManager.getRoom(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: '房间不存在',
        data: undefined,
        message: '房间不存在'
      });
      return;
    }
    if (room.config?.isPrivate) {
      res.json({
        success: true,
        data: {
          exists: true
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          exists: false
        },
      });
    }
  } catch (error: any) {
    logger.error((error as any).toString())
    res.status(500).json({
      success: false,
      error: error.message || '检测房间密码失败',
      data: undefined,
      message: error.message || '检测房间密码失败',
    });
  }
});

//验证房间密码是否正确
router.post<{ roomId: string }>('/rooms/:roomId/password/verify', (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomManager.getRoom(roomId);
    const { password } = req.body;
    if (!room) {
      res.status(404).json({
        success: false,
        error: '房间不存在',
        data: undefined,
        message: '房间不存在'
      });
      return;
    }
    if (room.config?.isPrivate) {
      if(password === room.config?.password){
        res.json({
          success: true,
          data: {
            isRight: true
          },
        });
      } else {
        res.json({
          success: true,
          data: {
            isRight: false
          },
        });
      }
    } else {
      res.json({
        success: true,
        data: {
          isRight: false
        },
      });
    }
  } catch (error: any) {
    logger.error((error as any).toString())
    res.status(500).json({
      success: false,
      error: error.message || '验证房间密码失败',
      data: undefined,
      message: error.message || '验证房间密码失败',
    });
  }
});

// 获取特定房间信息
router.get<{ roomId: string }>('/rooms/:roomId', (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomManager.getRoomSummary(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: '房间不存在',
        data: undefined,
        message: '房间不存在'
      });
      return;
    }

    res.json({
      status: 'success',
      data: { room },
    });
  } catch (error) {
    logger.error((error as any).toString())
    res.status(500).json({
      success: false,
      error: '获取指定房间信息失败',
      data: undefined,
      message: '获取指定房间信息失败'
    });
  }
});

// 创建新房间
// 添加请求体类型
interface CreateRoomRequestBody {
  name: string;
}

// 删除房间
router.delete<{ roomId: string }>('/rooms/:roomId', (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const success = roomManager.deleteRoom(roomId);

    if (!success) {
      res.status(404).json({
        success: false,
        message: '房间不存在',
      });
      return;
    }

    res.json({
      success: true,
      message: '房间已删除',
    });
  } catch (error) {
    logger.error((error as any).toString())
    res.status(500).json({
      success: false,
      error: '删除房间失败',
      data: undefined,
      message: '删除房间失败'
    });
  }
});

// 检查房间人数是否已满
router.get<{ roomId: string }>(
  '/rooms/:roomId/full',
  (req: Request<{ roomId: string }>, res: Response) => {
    try {
      const { roomId } = req.params;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        res.status(404).json({
          success: false,
          error: '房间不存在',
          data: undefined,
          message: '房间不存在',
        });
        return;
      }

      const onlineNumber = room.peers.size;
      const maxUsers = Number(room.config?.maxUsers ?? 0);
      const full = maxUsers > 0 ? onlineNumber >= maxUsers : false;

      res.json({
        success: true,
        data: {
          full,
          onlineNumber,
          maxUsers,
        },
      });
    } catch (error: any) {
      logger.error((error as any).toString());
      res.status(500).json({
        success: false,
        error: error.message || '检测房间人数是否已满失败',
        data: undefined,
        message: error.message || '检测房间人数是否已满失败',
      });
    }
  }
);

export default router; 