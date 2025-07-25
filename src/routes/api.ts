import { Router, Request, Response } from 'express';
import { roomManager } from '../lib/room';
import { mediasoupHandler } from '../lib/mediasoup';

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
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// 获取所有房间
router.get('/rooms', (req: Request, res: Response) => {
  try {
    const rooms = roomManager.getAllRoomsSummary();
    
    res.json({
      status: 'success',
      data: { rooms },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
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
        status: 'error',
        message: 'Room not found',
      });
      return;
    }
    
    res.json({
      status: 'success',
      data: { room },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// 创建新房间
// 添加请求体类型
interface CreateRoomRequestBody {
  name: string;
}

// 修改POST /rooms路由
router.post<{}, {}, CreateRoomRequestBody>('/rooms', (req: Request<{}, {}, CreateRoomRequestBody>, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Room name is required',
      });
      return;
    }
    
    const room = roomManager.createRoom(name);
    
    res.status(201).json({
      status: 'success',
      data: { 
        room: {
          id: room.id,
          name: room.name,
          createdAt: room.createdAt,
        }
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// 删除房间
router.delete<{ roomId: string }>('/rooms/:roomId', (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const success = roomManager.deleteRoom(roomId);
    
    if (!success) {
      res.status(404).json({
        status: 'error',
        message: 'Room not found',
      });
      return;
    }
    
    res.json({
      status: 'success',
      message: 'Room deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router; 