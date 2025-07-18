# MediaSoup SFU WebSocket 服务器

基于MediaSoup实现的SFU架构WebRTC服务器，使用WebSocket进行信令传输。

## 功能特点

- 基于SFU (Selective Forwarding Unit) 架构
- 使用MediaSoup作为媒体服务器
- 通过Socket.IO实现WebSocket信令
- 支持音频和视频的发送和接收
- 房间管理功能
- REST API接口

## 环境要求

- Node.js 18+
- Yarn 包管理器
- 支持C++编译工具链（用于MediaSoup的编译）

## 安装

```bash
# 克隆仓库
git clone <repository-url>
cd server

# 安装依赖
yarn install
```

## 配置

1. 复制环境变量示例文件：

```bash
cp env.example .env
```

2. 编辑 `.env` 文件配置你的环境变量：

```
# 服务器配置
PORT=3000                   # 服务器监听端口
HOST=127.0.0.1              # 服务器监听地址
HTTPS=false                 # 是否启用HTTPS

# HTTPS证书配置（如果启用HTTPS）
# SSL_CERT_PATH=./certs/cert.pem
# SSL_KEY_PATH=./certs/key.pem

# MediaSoup配置
MEDIASOUP_LISTEN_IP=127.0.0.1     # MediaSoup监听地址
MEDIASOUP_ANNOUNCED_IP=127.0.0.1  # MediaSoup对外公布的地址（用于NAT环境）
MEDIASOUP_MIN_PORT=40000          # MediaSoup端口范围最小值
MEDIASOUP_MAX_PORT=49999          # MediaSoup端口范围最大值
```

## 运行

### 开发环境

```bash
yarn dev
```

### 生产环境

```bash
# 编译TypeScript
yarn build

# 启动服务器
yarn start
```

## API接口

### 获取服务器状态

```
GET /api/status
```

### 获取所有房间

```
GET /api/rooms
```

### 获取特定房间信息

```
GET /api/rooms/:roomId
```

### 创建新房间

```
POST /api/rooms
Content-Type: application/json

{
  "name": "房间名称"
}
```

### 删除房间

```
DELETE /api/rooms/:roomId
```

## WebSocket事件

### 客户端事件

- `createOrJoin`: 创建或加入房间
- `leave`: 离开房间
- `getRouterRtpCapabilities`: 获取路由器的RTP能力
- `createWebRtcTransport`: 创建WebRTC传输
- `connectWebRtcTransport`: 连接WebRTC传输
- `produce`: 创建生产者(发送媒体流)
- `consume`: 创建消费者(接收媒体流)
- `resumeConsumer`: 恢复消费者
- `closeProducer`: 关闭生产者
- `getProducers`: 获取房间内的生产者列表
- `getRooms`: 获取可用房间列表

### 服务器事件

- `joined`: 已加入房间
- `peerJoined`: 新成员加入房间
- `peerLeft`: 成员离开房间
- `newProducer`: 新的生产者
- `producerClosed`: 生产者已关闭
- `error`: 错误信息

## 注意事项

- 在生产环境中，建议配置HTTPS以确保WebRTC能正常工作
- 需要正确配置防火墙，允许MediaSoup使用的端口范围
- 在NAT环境中，需要正确设置`MEDIASOUP_ANNOUNCED_IP`为公网IP地址

## 许可证

MIT 