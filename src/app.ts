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
import { mediasoupHandler } from './lib/mediasoup';
import { handleConnection } from './controllers/socket-controller';

// 创建express应用程序
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

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
  } catch (error) {
    console.error('Failed to create HTTPS server, falling back to HTTP:', error);
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
    console.log('Starting 3D Chat Server...');

    // 初始化数据库
    console.log('Initializing Database...');
    await initializeDatabase();

    // 初始化mediasoup
    console.log('Initializing MediaSoup...');
    await mediasoupHandler.init();

    // 启动服务器
    server.listen(config.port, config.host, () => {
      console.log(`🚀 3D Chat Server running on ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}`);
      console.log('🎥 MediaSoup initialized');
      console.log('🔌 Socket.IO ready for connections');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// 启动服务器
start(); 