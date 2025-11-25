import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * 自定义错误基类
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string = '验证失败') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * 认证错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 权限错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 冲突错误
 */
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 内部服务器错误
 */
export class InternalServerError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

/**
 * 异步错误捕获装饰器
 * 用于自动捕获控制器中的异步错误
 */
export function catchAsync(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 开发环境错误响应
 */
const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: 'error',
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * 生产环境错误响应
 */
const sendErrorProd = (err: AppError, res: Response) => {
  // 可操作的错误：发送详细消息给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  } else {
    // 编程错误：不泄露错误详情
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    });
  }
};

/**
 * 全局错误处理中间件
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 记录错误日志
  logger.error('全局错误捕获', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // 处理特定类型的错误
    let error = { ...err };
    error.message = err.message;

    // Mongoose 验证错误
    if (err.name === 'ValidationError') {
      const message = `${err.message}`;
      error = new ValidationError(message);
    }

    // JWT 错误
    if (err.name === 'JsonWebTokenError') {
      const message = '无效的token，请重新登录!';
      error = new UnauthorizedError(message);
    }

    // JWT 过期错误
    if (err.name === 'TokenExpiredError') {
      const message = 'Token已过期，请重新登录!';
      error = new UnauthorizedError(message);
    }

    // TypeORM 错误
    if (err.name === 'QueryFailedError') {
      const message = '数据库查询失败';
      error = new InternalServerError(message);
    }

    sendErrorProd(error, res);
  }
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new NotFoundError(`路由 ${req.originalUrl} 未找到`);
  next(err);
};