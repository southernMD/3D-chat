# NEXUS³ - 3D聊天系统

一个基于WebRTC和Three.js的沉浸式3D聊天平台，支持实时语音通话、3D角色交互和多人协作。

## 🌟 项目概述

NEXUS³是一个创新的3D聊天系统，将传统的文字聊天提升到三维空间。用户可以在虚拟的3D环境中进行实时语音通话，控制3D角色进行互动

## ✨ 核心功能

### 🎮 3D虚拟环境
- **沉浸式3D场景** - 基于Three.js的高质量3D渲染
- **MMD角色系统** - 支持MMD模型加载和动画播放
- **物理碰撞检测** - BVH物理系统提供真实的碰撞交互
- **场景对象管理** - 地面、墙体、装饰等场景元素

### 🎤 实时通信
- **WebRTC音频通话** - 基于MediaSoup的SFU架构
- **多人语音聊天** - 支持多人同时语音交流
- **数据通道消息** - 实时文字消息传输
- **智能类型判断** - 自动识别媒体类型，优化传输效率

### 🏠 房间系统
- **多人房间** - 创建或加入3D聊天房间
- **房间类型** - 支持默认房间和学校房间
- **实时同步** - 用户状态、位置、动作实时同步
- **权限管理** - 房间创建者和管理员权限

### 🎯 交互功能
- **角色控制** - WASD移动，鼠标视角控制
- **物品系统** - 鸡蛋发射、物品收集
- **UI界面** - 游戏化UI设计，物品栏管理
- **状态显示** - 实时显示用户状态和房间信息

## 🏗️ 技术架构

### 前端技术栈
- **Vue 3** - 现代化前端框架
- **TypeScript** - 类型安全的JavaScript
- **Three.js** - 3D图形渲染引擎
- **GSAP** - 高性能动画库
- **Pinia** - 状态管理
- **Vite** - 快速构建工具

### 后端技术栈
- **Node.js** - 服务器运行环境
- **Express** - Web应用框架
- **Socket.IO** - 实时通信
- **MediaSoup** - WebRTC媒体服务器
- **TypeORM** - 数据库ORM
- **MySQL** - 关系型数据库

### 核心组件

#### 3D客户端 (`server/3d-chat-client/`)
- **SceneManager** - 3D场景管理
- **MMDModelManager** - MMD模型管理
- **StaticMMDModelManager** - 静态模型管理
- **ObjectManager** - 场景对象管理
- **BVHPhysics** - 物理碰撞系统
- **WebRTCStore** - WebRTC状态管理

#### 服务器端 (`server/`)
- **MediaSoup处理器** - WebRTC媒体处理
- **Socket控制器** - 实时通信处理
- **房间管理** - 房间生命周期管理
- **用户认证** - JWT身份验证
- **文件管理** - 静态资源服务

#### WebRTC演示 (`server/app-vite/`)
- **基础WebRTC功能** - 音频通话和数据通道
- **房间管理** - 创建和加入房间
- **消息传输** - 实时消息通信

## 🚀 快速开始

### 环境要求
- Node.js 22+
- MySQL 5.7
- 支持C++编译工具链（MediaSoup需要）


### 配置环境

1. **服务器配置**
```bash
cd server
cp env.example .env
```

2. **3D客户端配置**
```bash
cd server/3d-chat-client
cp env.example .env
```

### 运行项目

1. **启动服务器**
```bash
cd server
npm run dev
```
只能用npm

2. **启动3D客户端**
```bash
cd server/3d-chat-client
yarn dev
```

3. **启动WebRTC演示**
```bash
cd server/app-vite
npm run dev
```

## 🐳 Docker部署
2核2GB Centos8.5部署

### 服务器部署
先部署turn服务器 [参考部署](https://blog.csdn.net/qq_44938451/article/details/122158975)

```bash
cp .env.example .env
```
修改MEDIASOUP_ANNOUNCED_IP为服务器公网ip
MEDIASOUP_LISTEN_IP HOST 为0.0.0.0
更具情况配置https
certs在构建镜像前直接放在文件目录中

```bash
cd server
docker build -t 3d-chat-server .
docker run -d --name 3d-chat-server --network host 3d-chat-server
```
首次构建时长超过30分钟
必须以network host部署，因为mediasoup需要映射40000到49999udp，采用端口映射会直接卡死

### 3D客户端部署
先启动mysql5.7镜像
```bash
docker run -d \
  --name mysql-db \
  -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=123\
  mysql:5.7
```
外部在3307端口上

```bash
cp .env.example .env.production
```
VITE_API_URL=/api
VITE_WS_HOST=公网ip
VITE_TURN_URL部署的turn服务器的地址

nginx的location /socket.io/应该是没用的（我不知道，这个端口我是没有的）
证书用docker-compose挂载本机目录/etc/nginx/ssl/
```bash
cd server/3d-chat-client
docker compose up -d --build
```

## 🔍 开发指南

### 项目结构
```
3d-chat/
├── server/                    # 服务器端
│   ├── src/                   # TypeScript源码
│   │   ├── controllers/      # 控制器
│   │   ├── lib/              # 核心库
│   │   ├── routes/           # 路由
│   │   └── entities/         # 数据实体
│   ├── 3d-chat-client/       # 3D客户端
│   │   ├── src/
│   │   │   ├── components/   # Vue组件
│   │   │   ├── models/       # 3D模型管理
│   │   │   ├── physics/      # 物理系统
│   │   │   └── stores/       # 状态管理
│   │   └── public/           # 静态资源
│   └── app-vite/             # WebRTC演示
│       └── src/              # 演示代码
└── demo-server/              # 演示服务器
```

## 注意
火狐浏览器不可用

##  许可证

MIT License

**NEXUS³** - 在第三维度聊天，体验未来的交流方式！🚀
