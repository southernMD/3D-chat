import 'reflect-metadata';
import express from 'express';
import http from 'http';
import https from 'https';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config/config';
import { initializeDatabase } from './config/database';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import fileRoutes from './routes/file';
import { authMiddleware } from './middleware/authMiddleware';
import { mediasoupHandler } from './lib/mediasoup';
import { handleConnection } from './controllers/socket-controller';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

// 创建express应用程序
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源服务 - 提供models文件夹下的文件
app.use('/models', express.static(path.join(__dirname, '/models')));

// API路由
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
// 文件上传路由需要JWT认证
// app.use('/api/file', authMiddleware.authenticateToken, fileRoutes);
app.use('/api/file', fileRoutes);

// 404处理中间件（放在所有路由之后）
app.use(notFoundHandler);

// 全局错误处理中间件（必须放在最后）
app.use(globalErrorHandler);

// 根路由
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'MediaSoup SFU Server is running',
  });
});

// 创建HTTP/HTTPS服务器
let server: http.Server | https.Server;

if (config.useHttps) {
  // 如果配置了HTTPS，创建HTTPS服务器
  try {
    const options = {
      key: fs.readFileSync(config.sslKeyPath || ''),
      cert: fs.readFileSync(config.sslCertPath || '')
    };
    server = https.createServer(options, app);
    logger.info('成功创建HTTPS服务器');
  } catch (error) {
    logger.error('创建HTTPS服务器失败，回退到HTTP', error);
    server = http.createServer(app);
  }
} else {
  // 否则创建HTTP服务器
  server = http.createServer(app);
}

// 创建Socket.IO服务器
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 当客户端连接时处理Socket.IO连接
io.on('connection', (socket) => {
  handleConnection(socket, io);
});

// 启动应用程序
async function start() {
  try {
    logger.info('正在启动3D Chat服务器...');

    // 初始化数据库
    logger.info('正在初始化数据库...');
    await initializeDatabase();
    logger.info('数据库初始化完成');

    // 初始化mediasoup
    logger.info('正在初始化MediaSoup...');
    await mediasoupHandler.init();
    logger.info('MediaSoup初始化完成');

    // 启动服务器
    server.listen(config.port, config.host, () => {
      logger.info(`🚀 3D Chat服务器运行在 ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}`);
      logger.info('🎥 MediaSoup已初始化');
      logger.info('🔌 Socket.IO准备就绪，等待连接');
    });
  } catch (error) {
    logger.error('启动服务器失败', error);
    process.exit(1);
  }
}

// 全局进程错误处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', {
    message: error.message,
    stack: error.stack
  });
  
  // 记录错误后优雅关闭
  logger.info('正在优雅关闭服务器...');
  
  // 给其他操作一些时间来完成
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('未处理的Promise拒绝', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise
  });
  
  // 对于未处理的Promise拒绝，我们不立即退出，但记录警告
  logger.warn('警告: 检测到未处理的Promise拒绝，请检查代码中的异步错误处理');
});

// 监听SIGTERM和SIGINT信号进行优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在优雅关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在优雅关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 启动服务器
start(); 