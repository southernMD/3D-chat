/**
 * 全局错误处理使用示例
 * 
 * 这个文件展示了如何在项目中使用我们的全局错误处理系统
 */

import { Request, Response, NextFunction } from 'express';
import { 
  catchAsync, 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  InternalServerError,
  ConflictError 
} from '../middleware/errorHandler';
import { logger } from '../lib/logger';

/**
 * 使用示例：在控制器中抛出错误
 */
export class ExampleController {
  
  // 示例1：使用catchAsync装饰器自动捕获异步错误
  createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email, username } = req.body;
    
    // 验证输入
    if (!email || !username) {
      throw new ValidationError('邮箱和用户名不能为空');
    }
    
    // 检查用户是否已存在
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('用户已存在');
    }
    
    // 创建用户
    const user = await this.createUserInDatabase(email, username);
    
    res.status(201).json({
      success: true,
      data: user
    });
  });

  // 示例2：手动错误处理（不推荐，但有时必要）
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ValidationError('用户ID不能为空');
      }
      
      const user = await this.findUserById(id);
      if (!user) {
        throw new NotFoundError('用户不存在');
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      // 手动传递给错误处理中间件
      next(error);
    }
  }

  // 示例3：认证错误
  authenticateUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('缺少认证令牌');
    }
    
    const user = await this.verifyToken(token);
    if (!user) {
      throw new UnauthorizedError('无效的认证令牌');
    }
    
    // 将用户信息添加到请求对象
    (req as any).user = user;
    
    res.json({
      success: true,
      data: user
    });
  });

  // 示例4：内部服务器错误
  performComplexOperation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 执行复杂操作
      await this.complexDatabaseOperation();
      
      res.json({
        success: true,
        message: '操作完成'
      });
    } catch (error) {
      // 记录详细错误信息
      logger.error('复杂操作失败', {
        operation: 'performComplexOperation',
        error: error,
        requestId: req.headers['x-request-id']
      });
      
      // 抛出内部服务器错误
      throw new InternalServerError('操作执行失败，请稍后重试');
    }
  });

  // 模拟数据库操作
  private async findUserByEmail(email: string): Promise<any> {
    // 模拟查找用户
    return null;
  }

  private async findUserById(id: string): Promise<any> {
    // 模拟查找用户
    return null;
  }

  private async createUserInDatabase(email: string, username: string): Promise<any> {
    // 模拟创建用户
    return { id: '123', email, username };
  }

  private async verifyToken(token: string): Promise<any> {
    // 模拟验证令牌
    return null;
  }

  private async complexDatabaseOperation(): Promise<void> {
    // 模拟复杂数据库操作
    throw new Error('数据库连接失败');
  }
}

/**
 * 在路由中使用错误处理的示例
 */
import { Router } from 'express';

const router = Router();
const controller = new ExampleController();

// 使用catchAsync包装的方法可以直接使用
router.post('/users', controller.createUser);

// 对于普通方法，需要手动包装
router.get('/users/:id', catchAsync(controller.getUserById.bind(controller)));

// 认证示例
router.get('/auth/me', controller.authenticateUser);

// 复杂操作示例
router.post('/operations/complex', controller.performComplexOperation);

export default router;

/**
 * 自定义错误类型示例
 */
export class CustomBusinessError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'CustomBusinessError';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 中间件错误处理示例
 */
export const exampleMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 检查某些条件
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedError('缺少API密钥');
    }
    
    if (apiKey !== 'valid-api-key') {
      throw new UnauthorizedError('无效的API密钥');
    }
    
    next();
  } catch (error) {
    next(error); // 传递给错误处理中间件
  }
};

/**
 * Socket.IO错误处理示例
 */
export const handleSocketError = (socket: any) => {
  socket.on('error', (error: Error) => {
    logger.error('Socket.IO错误', {
      socketId: socket.id,
      error: error.message,
      stack: error.stack
    });
    
    // 向客户端发送错误消息
    socket.emit('error', {
      message: '连接发生错误',
      timestamp: new Date().toISOString()
    });
  });
};