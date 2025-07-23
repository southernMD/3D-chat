# 3D聊天 WebRTC演示

基于MediaSoup实现的SFU架构WebRTC服务器，支持实时音频通话、数据通道消息传输和多人房间系统。

## 功能特点

- 🏠 **多人房间系统** - 创建或加入房间，支持多人同时在线
- 🎤 **实时音频通话** - 高质量音频传输，支持多人语音聊天
- 💬 **数据通道消息** - 基于WebRTC数据通道的实时消息传输
- 🔗 **SFU架构** - 基于MediaSoup的高效媒体转发
- 📱 **现代化Web界面** - 包含完整的前端演示应用
- 🔧 **智能类型判断** - 自动识别生产者类型，精确消费
- 📊 **REST API接口** - 完整的房间管理API

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

---

# 音频传输功能详细说明

## 已实现的功能

### 1. 音频生产者（发送音频）
- ✅ 麦克风权限请求
- ✅ 音频轨道获取和配置
- ✅ 音频生产者创建
- ✅ 在 `createProducerTransport` 内添加了 `produce` 事件监听
- ✅ 音频编码配置（Opus立体声，DTX）

### 2. 音频消费者（接收音频）
- ✅ 监听新音频生产者事件 (`newProducer`)
- ✅ 自动消费房间内的音频生产者
- ✅ 音频播放元素创建和管理
- ✅ 音频流播放

### 3. UI控制
- ✅ 麦克风开启/关闭按钮
- ✅ 麦克风状态显示
- ✅ 视觉反馈和样式

### 4. 资源管理
- ✅ 音频资源清理
- ✅ 音频元素移除
- ✅ 状态重置

### 5. 智能类型判断
- ✅ 服务器端返回生产者类型信息 (`kind`, `type`)
- ✅ 客户端根据类型主动判断消费方式
- ✅ 避免盲目尝试，提高效率和可靠性

## 技术实现细节

### 客户端实现

#### WebRTC管理器新增方法：
- `toggleMicrophone()`: 切换麦克风状态
- `enableMicrophone()`: 启用麦克风并创建音频生产者
- `disableMicrophone()`: 禁用麦克风
- `consumeAudio()`: 消费远程音频流

#### 事件监听：
- `newProducer`: 监听新的音频生产者
- `producerClosed`: 监听音频生产者关闭
- `produce`: 在生产者传输上监听音频生产事件

#### 智能类型判断逻辑：
- 服务器端 `getProducers` 返回生产者类型信息 (`kind`, `type`)
- 客户端根据 `type` 和 `kind` 主动判断：
  - `type === 'data'` 或 `kind === 'data'` → 触发数据消费
  - `type === 'media'` 且 `kind === 'audio'` → 触发音频消费
  - 其他类型 → 跳过或记录日志
- 避免了盲目尝试，提高了效率和可靠性

### 服务器端支持
- 现有的mediasoup配置已支持音频传输
- `produce` 事件处理音频生产者创建
- `consume` 事件处理音频消费者创建
- `resumeConsumer` 恢复音频消费者
- `getProducer()` 方法获取生产者类型信息

---

# 测试指南

## 基本音频测试

### 1. 启动应用
```bash
npm run dev
```

### 2. 双人音频测试
1. 打开两个浏览器窗口
2. 访问 http://localhost:3000
3. 在两个窗口中加入同一个房间
4. 在第一个窗口点击"🎤 开启麦克风"
5. 允许浏览器麦克风权限
6. 观察状态变为"麦克风已开启"
7. 在第二个窗口应该能听到第一个窗口的音频

### 3. 双向音频测试
1. 在第二个窗口也开启麦克风
2. 两个窗口应该能相互听到对方的声音

### 4. 多人音频测试
1. 打开更多浏览器窗口
2. 加入同一个房间
3. 测试多人同时开启麦克风的效果

## 类型判断功能测试

### 改进前后对比

#### 改进前（盲目尝试）
```javascript
// 先尝试数据消费
try {
  await this.consumeData(producerId, producerPeerId);
} catch (dataError) {
  // 数据消费失败，再尝试音频消费
  try {
    await this.consumeAudio(producerId, producerPeerId);
  } catch (audioError) {
    // 两种都失败
  }
}
```

#### 改进后（智能判断）
```javascript
// 根据类型主动判断
if (type === 'data' || kind === 'data') {
  // 明确是数据生产者，直接消费数据
  await this.consumeData(producerId, producerPeerId);
} else if (type === 'media' && kind === 'audio') {
  // 明确是音频生产者，直接消费音频
  await this.consumeAudio(producerId, producerPeerId);
}
```

### 验证类型判断
1. 测试数据生产者：发送消息，观察日志显示"成功消费数据生产者"
2. 测试音频生产者：开启麦克风，观察日志显示"成功消费音频生产者"
3. 验证不会有"尝试消费生产者失败"的错误日志

---

# 故障排除

## 常见问题

### 1. 麦克风权限被拒绝
- 检查浏览器设置
- 确保使用HTTPS或localhost
- 在浏览器地址栏点击锁图标，允许麦克风访问

### 2. 听不到音频
- 检查浏览器音频设置
- 确认音频元素已创建（查看开发者工具）
- 检查控制台是否有错误
- 确认对方已开启麦克风

### 3. 音频质量问题
- 检查网络连接质量
- 查看WebRTC统计信息
- 检查CPU使用率

### 4. Consumer transport not found
- 确保消费者传输已正确创建
- 检查peerId是否正确传递
- 查看服务器端日志确认传输创建

## 调试信息

### 客户端调试
- 查看浏览器控制台日志
- 查看页面底部的日志区域
- 检查WebRTC连接状态
- 使用浏览器开发者工具的媒体面板

### 服务器端调试
- 查看终端输出的传输创建日志
- 检查房间和peer的状态
- 监控mediasoup的统计信息

### 关键日志信息
现在日志会显示：
- `成功消费数据生产者: [producerId]`
- `成功消费音频生产者: [producerId]`
- `跳过未支持的生产者类型: [type], kind: [kind]`
- `Transport created and saved: roomId=..., peerId=..., consuming=...`

---

# 代码结构

## 关键文件

### 客户端
- `app-vite/src/webrtc.ts`: WebRTC管理器，包含音频功能
- `app-vite/src/main.ts`: UI控制逻辑
- `app-vite/src/types.ts`: 类型定义
- `app-vite/index.html`: UI界面
- `app-vite/src/style.css`: 样式定义

### 服务器端
- `src/lib/mediasoup.ts`: MediaSoup处理器
- `src/controllers/socket-controller.ts`: Socket.IO事件处理
- `src/lib/room.ts`: 房间管理
- `src/config/config.ts`: 配置文件

## 关键方法调用流程

### 音频生产流程
1. 用户点击麦克风按钮 → `handleToggleMicrophone()`
2. 调用 `webrtcManager.toggleMicrophone()`
3. 执行 `enableMicrophone()` 或 `disableMicrophone()`
4. 创建音频生产者 → 触发 `produce` 事件
5. 服务器通知其他客户端 → `newProducer` 事件
6. 其他客户端自动调用 `consumeAudio()`
7. 创建音频元素并播放音频流

### 智能类型判断流程
1. 客户端请求 `getProducers`
2. 服务器返回包含 `kind` 和 `type` 的生产者信息
3. 客户端根据类型信息直接调用相应的消费方法
4. 避免错误尝试，提高效率

---

# 优势总结

## 技术优势
1. **精确性**: 根据明确的类型信息进行消费，避免错误尝试
2. **效率**: 直接调用正确的消费方法，不浪费时间
3. **可维护性**: 代码逻辑更清晰，更容易调试
4. **扩展性**: 未来添加视频等其他媒体类型更容易
5. **可靠性**: 减少了因为错误尝试导致的潜在问题

## 用户体验优势
1. **低延迟**: 高效的音频传输
2. **高质量**: Opus编码，支持立体声
3. **易用性**: 简单的一键开启/关闭麦克风
4. **稳定性**: 智能类型判断减少错误

## 许可证

MIT