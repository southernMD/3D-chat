import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

// 扩展 Request 接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
      };
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // JWT 认证中间件
  authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        res.status(401).json({
          success: false,
          message: '访问令牌缺失'
        });
        return;
      }

      // 验证 token
      const verifyResult = await this.authService.verifyToken(token);
      
      if (!verifyResult.success) {
        res.status(403).json({
          success: false,
          message: 'token无效或已过期'
        });
        return;
      }

      // 将用户信息添加到请求对象中
      req.user = verifyResult.data;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: '认证过程中发生错误'
      });
    }
  };
}

// 导出中间件实例
export const authMiddleware = new AuthMiddleware();