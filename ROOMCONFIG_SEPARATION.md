# RoomConfig 拆分重构

## 概述
将 RoomConfig 从 RoomInfo 中拆分出来，作为独立的 ref 进行管理，实现前后端的清晰分离。

## 前端修改

### 1. WebRTC Utils (`server/3d-chat-client/src/utils/webrtc.ts`)

#### 接口修改
```typescript
// 修改前
export interface RoomInfo {
  roomId: string
  peerId: string
  roomConfig: RoomConfig  // ❌ 包含在RoomInfo中
}

// 修改后
export interface RoomInfo {
  roomId: string
  peerId: string
  // ✅ 移除了roomConfig字段
}
```

#### WebRTCManager类修改
```typescript
// 添加了RoomConfig回调属性
private updateRoomConfigCallback?: (config: RoomConfig) => void

// 添加了设置回调的公共方法
setRoomConfigCallback(callback: (config: RoomConfig) => void) {
  this.updateRoomConfigCallback = callback
}

// 在joined事件中分别调用两个回调
this.updateRoomInfoCallback({ roomId, peerId })
this.updateRoomConfigCallback?.(roomConfig)

// 新增roomConfig事件监听
this.state.socket.on('roomConfig', (roomConfig: RoomConfig) => {
  this.log(`收到房间配置: ${JSON.stringify(roomConfig)}`)
  this.state.roomConfig = roomConfig
  this.updateRoomConfigCallback?.(roomConfig)
})
```

### 2. WebRTC Store (`server/3d-chat-client/src/stores/webrtc.ts`)

#### 添加独立的roomConfig ref
```typescript
const roomConfig = ref<RoomConfig | null>(null)
```

#### 设置RoomConfig回调
```typescript
// 在WebRTCManager初始化后设置回调
webrtcManager.setRoomConfigCallback((config: RoomConfig) => {
  roomConfig.value = config
  console.log('房间配置更新:', config)
})
```

#### 导出roomConfig
```typescript
return {
  // ... 其他导出
  roomConfig,  // ✅ 新增导出
}
```

## 后端修改

### Socket Controller (`server/src/controllers/socket-controller.ts`)

#### joined事件修改
```typescript
// 修改前 - roomConfig包含在joined事件中
socket.emit('joined', {
  roomId,
  peerId,
  roomConfig,  // ❌ 包含在joined中
  modelHash,
  peers: // ...
});

// 修改后 - 保持joined事件结构，但添加单独的roomConfig事件
socket.emit('joined', {
  roomId,
  peerId,
  roomConfig,  // 保持兼容性
  modelHash,
  peers: // ...
});

// ✅ 新增单独的roomConfig事件
socket.emit('roomConfig', roomConfig);
```

## 数据流程

### 修改前的流程
```
服务器 joined事件 → { roomId, peerId, roomConfig }
    ↓
WebRTCManager → updateRoomInfoCallback({ roomId, peerId, roomConfig })
    ↓
WebRTC Store → roomInfo.value = { roomId, peerId, roomConfig }
```

### 修改后的流程
```
服务器 joined事件 → { roomId, peerId, roomConfig }
    ↓
WebRTCManager → updateRoomInfoCallback({ roomId, peerId })
    ↓
WebRTC Store → roomInfo.value = { roomId, peerId }

服务器 roomConfig事件 → roomConfig
    ↓
WebRTCManager → updateRoomConfigCallback(roomConfig)
    ↓
WebRTC Store → roomConfig.value = roomConfig
```

## 优势

### 1. 数据分离
- RoomInfo 只包含房间基本信息（roomId, peerId）
- RoomConfig 作为独立的配置对象管理
- 职责更加清晰

### 2. 类型安全
- 避免了RoomInfo接口的复杂嵌套
- 每个数据结构都有明确的用途
- 更好的TypeScript类型推导

### 3. 可维护性
- 配置变更不影响房间基本信息
- 便于后续扩展和修改
- 代码结构更加清晰

### 4. 性能优化
- 减少不必要的数据传输
- 配置和基本信息可以独立更新
- 更好的缓存策略

## 使用方式

### 在组件中使用
```typescript
import { useWebRTCStore } from '@/stores/webrtc'

const webrtcStore = useWebRTCStore()

// 获取房间基本信息
const roomInfo = computed(() => webrtcStore.roomInfo)

// 获取房间配置
const roomConfig = computed(() => webrtcStore.roomConfig)

// 使用示例
console.log('房间ID:', roomInfo.value?.roomId)
console.log('地图类型:', roomConfig.value?.map)
```

### 在3D场景中使用
```typescript
// 检查是否为学校地图
if (roomConfig.value?.map === 'school') {
  // 启用彩蛋功能
  enableEggFeatures()
}
```

## 兼容性

### 向后兼容
- 服务器仍然在joined事件中发送roomConfig（保持兼容性）
- 客户端同时监听joined和roomConfig事件
- 现有代码可以逐步迁移

### 迁移建议
1. 优先使用独立的roomConfig ref
2. 逐步移除对roomInfo.roomConfig的依赖
3. 更新相关的类型定义和接口

## 测试验证

### 验证步骤
1. 创建房间并加入
2. 检查roomInfo是否只包含roomId和peerId
3. 检查roomConfig是否正确接收配置信息
4. 验证彩蛋功能在school地图中正常工作
5. 确认用户列表和消息功能正常

### 预期结果
- roomInfo: `{ roomId: "xxx", peerId: "yyy" }`
- roomConfig: `{ map: "school", name: "房间名", ... }`
- 功能完全正常，无回归问题

## 注意事项

1. **数据同步**：确保roomConfig的更新及时同步到所有使用的地方
2. **错误处理**：添加适当的错误处理和默认值
3. **类型检查**：确保所有使用roomConfig的地方都有正确的类型检查
4. **内存管理**：及时清理不再使用的引用，避免内存泄漏
