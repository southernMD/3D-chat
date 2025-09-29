# 🌐 WebRTC 模型状态传输集成报告

## 🎯 **功能需求**

用户要求：
> "在webrtc utils使用mediasoup数据生产者向其他客户端传输模型状态信息"

## ✅ **实现方案**

### **1. 数据结构定义**

#### **模型状态数据接口**
```typescript
export interface ModelStateData {
  type: 'modelState'
  peerId: string
  timestamp: number
  state: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    animation: {
      currentAnimation: string
      walkActionActive: boolean
      standActionActive: boolean
      isWalking?: boolean
    }
    modelInfo?: {
      dimensions: { width: number; height: number; depth: number }
      hasAnimations: boolean
    }
    physics?: {
      isOnGround: boolean
      velocity: { x: number; y: number; z: number }
    }
  }
}
```

#### **数据通道消息类型**
```typescript
export type DataChannelMessage = {
  type: 'chat'
  message: string
  peerId: string
  timestamp: number
} | ModelStateData
```

### **2. WebRTCManager 扩展功能**

#### **新增属性**
```typescript
private modelStateCallback?: ModelStateCallback
private modelStateInterval?: number
private lastModelStateTime: number = 0
private modelStateUpdateRate: number = 60 // 每秒60次更新
```

#### **新增方法**

**发送模型状态数据:**
```typescript
public sendModelState(modelState: ModelStateData['state']): void
```

**开始模型状态传输:**
```typescript
public startModelStateTransmission(
  getModelStateFunction: () => ModelStateData['state'] | null,
  updateRate: number = 60
): void
```

**停止模型状态传输:**
```typescript
public stopModelStateTransmission(): void
```

**设置模型状态回调:**
```typescript
public setModelStateCallback(callback: ModelStateCallback): void
```

### **3. 数据传输机制**

#### **发送端流程**
```
模型状态获取 → JSON序列化 → TextEncoder编码 → DataProducer发送
```

#### **接收端流程**
```
DataConsumer接收 → TextDecoder解码 → JSON解析 → 类型判断 → 回调处理
```

#### **消息处理逻辑**
```typescript
dataConsumer.on('message', (message: ArrayBuffer) => {
  try {
    const decodedMessage = new TextDecoder().decode(message)
    const data: DataChannelMessage = JSON.parse(decodedMessage)
    
    if (data.type === 'chat') {
      // 处理聊天消息
      this.addMessageCallback(data.message, false, senderName)
    } else if (data.type === 'modelState') {
      // 处理模型状态数据
      if (this.modelStateCallback) {
        this.modelStateCallback(producerPeerId, data.state)
      }
    }
  } catch (error) {
    // 兼容旧版本的纯文本消息
    this.addMessageCallback(decodedMessage, false, senderName)
  }
})
```

## 🎮 **使用示例**

### **1. 初始化 WebRTC 管理器**
```typescript
const webrtcManager = new WebRTCManager(
  logCallback,
  updateConnectionStatusCallback,
  updateRoomInfoCallback,
  updatePeersListCallback,
  addMessageCallback,
  getEggPositionsCallback,
  modelStateCallback // 新增的模型状态回调
)
```

### **2. 设置模型状态回调**
```typescript
// 处理接收到的其他用户模型状态
const handleModelState = (peerId: string, modelState: ModelStateData['state']) => {
  console.log(`收到用户 ${peerId} 的模型状态:`, modelState)
  
  // 更新静态模型管理器中的用户模型
  if (staticModelManager) {
    const staticModel = staticModelManager.getUserModel(peerId)
    if (staticModel && staticModel.mesh) {
      // 更新位置
      staticModel.mesh.position.set(
        modelState.position.x,
        modelState.position.y,
        modelState.position.z
      )
      
      // 更新旋转
      staticModel.mesh.rotation.set(
        modelState.rotation.x * Math.PI / 180,
        modelState.rotation.y * Math.PI / 180,
        modelState.rotation.z * Math.PI / 180
      )
      
      // 更新动画状态
      if (modelState.animation.isWalking && !staticModel.isWalking) {
        staticModel.startWalking()
      } else if (!modelState.animation.isWalking && staticModel.isWalking) {
        staticModel.stopWalking()
      }
    }
  }
}

webrtcManager.setModelStateCallback(handleModelState)
```

### **3. 开始模型状态传输**
```typescript
// 获取主机用户模型状态的函数
const getModelState = (): ModelStateData['state'] | null => {
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel()
    if (model) {
      return model.getModelState()
    }
  }
  return null
}

// 开始传输，每秒30次更新（降低网络负载）
webrtcManager.startModelStateTransmission(getModelState, 30)
```

### **4. 在 3DChatRoom.vue 中集成**
```typescript
// 在 onMounted 中
onMounted(async () => {
  // ... 其他初始化代码

  // 设置模型状态回调
  if (webrtcManager) {
    webrtcManager.setModelStateCallback((peerId: string, modelState: any) => {
      // 更新其他用户的模型状态
      if (staticModelManager) {
        staticModelManager.updateUserModelState(peerId, modelState)
      }
    })

    // 开始模型状态传输
    const getModelState = () => {
      if (mmdModelManager && mmdModelManager.isModelLoaded()) {
        const model = mmdModelManager.getModel()
        return model ? model.getModelState() : null
      }
      return null
    }

    webrtcManager.startModelStateTransmission(getModelState, 30)
  }
})

// 在 onUnmounted 中
onUnmounted(() => {
  // 停止模型状态传输
  if (webrtcManager) {
    webrtcManager.stopModelStateTransmission()
  }
})
```

## 🔧 **技术特性**

### **性能优化**
- **频率控制**: 可配置的更新频率，默认60次/秒
- **时间限制**: 防止过于频繁的发送
- **静默日志**: 模型状态传输不产生过多日志输出
- **JSON压缩**: 使用结构化数据，减少传输大小

### **兼容性**
- **向后兼容**: 支持旧版本的纯文本聊天消息
- **错误处理**: JSON解析失败时自动降级到文本处理
- **类型安全**: 完整的 TypeScript 类型定义

### **可靠性**
- **自动清理**: 断开连接时自动停止传输
- **错误恢复**: 发送失败不影响其他功能
- **资源管理**: 正确的定时器清理和内存管理

## 🌐 **网络架构**

```
主机用户A                    其他用户B/C/D
     ↓                           ↓
Model.getModelState()      接收ModelStateData
     ↓                           ↓
WebRTC DataProducer  →  WebRTC DataConsumer
     ↓                           ↓
mediasoup服务器         modelStateCallback
     ↓                           ↓
实时状态同步            StaticModelManager更新
```

## 🎉 **实现效果**

现在 WebRTC 系统可以：

1. **实时传输模型状态** - 位置、旋转、动画状态
2. **多用户同步** - 所有用户都能看到其他用户的实时状态
3. **高性能传输** - 可配置的更新频率，优化网络使用
4. **类型安全** - 完整的 TypeScript 支持
5. **向后兼容** - 不影响现有的聊天功能
6. **自动管理** - 连接断开时自动清理资源

这个实现让你的3D聊天室具备了真正的多用户实时同步能力！🚀
