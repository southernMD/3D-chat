# 🎭 StaticMMDModelManager 使用指南

## 📋 **完成的架构**

现在你有了一个完整的双管理器系统：

```
主机用户（本地）          其他用户（远程）
      ↓                        ↓
MMDModelManager         StaticMMDModelManager
      ↓                        ↓
   Model类                 StaticModel类
      ↓                        ↓
  有物理交互               无物理交互
```

## 🔧 **StaticMMDModelManager API**

### **核心方法**

```typescript
// 1. 创建管理器
const staticModelManager = new StaticMMDModelManager(scene, renderer);

// 2. 初始化昵称标签管理器
staticModelManager.initializeNameTagManager(camera, container);

// 3. 加载用户模型
await staticModelManager.loadModel('user123', 'model-hash');

// 4. 设置用户昵称
staticModelManager.setNickname('user123', '张三');

// 5. 移除用户模型
staticModelManager.removeModel('user123');

// 6. 更新所有模型（每帧调用）
staticModelManager.update(deltaTime);

// 7. 清理所有资源
staticModelManager.cleanup();
```

### **查询方法**

```typescript
// 获取用户模型
const model = staticModelManager.getUserModel('user123');

// 检查模型是否已加载
const isLoaded = staticModelManager.isModelLoaded('user123');

// 获取模型数量
const count = staticModelManager.getModelCount();
```

## 🎮 **在 3DChatRoom.vue 中的使用**

```typescript
import { MMDModelManager } from '@/models/managers/MMDModelManager';
import { StaticMMDModelManager } from '@/models/managers/StaticMMDModelManager';

// 管理器实例
let mmdModelManager: MMDModelManager;           // 主机用户
let staticModelManager: StaticMMDModelManager;  // 其他用户

onMounted(async () => {
  // 1. 创建主机用户的模型管理器（有物理）
  mmdModelManager = new MMDModelManager(scene, renderer, bvhPhysics);
  
  // 2. 创建其他用户的静态模型管理器（无物理）
  staticModelManager = new StaticMMDModelManager(scene, renderer);
  
  // 3. 初始化昵称标签管理器
  staticModelManager.initializeNameTagManager(camera, container);
  
  // 4. 加载主机用户模型（有物理）
  const currentUserId = authStore.user?.id;
  if (currentUserId) {
    await mmdModelManager.loadModel('user-model-hash');
    mmdModelManager.setNickname('我的昵称');
  }
  
  // 5. 监听其他用户加入房间
  eventBus.on('user-joined', async (userData) => {
    if (userData.userId !== currentUserId) {
      // 为其他用户创建静态模型
      await staticModelManager.loadModel(userData.userId, userData.modelHash);
      staticModelManager.setNickname(userData.userId, userData.nickname);
    }
  });
  
  // 6. 监听用户离开房间
  eventBus.on('user-left', (userData) => {
    if (userData.userId !== currentUserId) {
      staticModelManager.removeModel(userData.userId);
    }
  });
});

// 动画循环
function animate() {
  // 更新主机用户模型（有物理）
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    mmdModelManager.update(1 / 60);
    const model = mmdModelManager.getModel();
    if (model) {
      model.updateMovement(scene);
    }
  }
  
  // 更新其他用户的静态模型（无物理）
  if (staticModelManager) {
    staticModelManager.update(1 / 60);
  }
}

// 清理资源
onUnmounted(() => {
  if (mmdModelManager) {
    mmdModelManager.cleanup();
  }
  if (staticModelManager) {
    staticModelManager.cleanup();
  }
});
```

## 🌐 **网络同步示例**

### **位置同步（如果需要）**

```typescript
// 主机用户广播位置
function broadcastPosition() {
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      const position = model.getPosition();
      const rotation = model.getRotation();
      
      webrtcStore.broadcast('user-position-update', {
        userId: authStore.user?.id,
        x: position.x,
        y: position.y,
        z: position.z,
        rx: rotation.x,
        ry: rotation.y,
        rz: rotation.z
      });
    }
  }
}

// 接收其他用户位置并更新静态模型
webrtcStore.on('user-position-update', (data) => {
  const currentUserId = authStore.user?.id;
  if (data.userId !== currentUserId && staticModelManager) {
    const model = staticModelManager.getUserModel(data.userId);
    if (model) {
      model.setPosition(data.x, data.y, data.z);
      model.setRotation(data.rx, data.ry, data.rz);
    }
  }
});
```

## 🎯 **关键特性**

### **主机用户 (MMDModelManager)**
- ✅ 完整物理系统（BVH碰撞）
- ✅ 键盘输入控制
- ✅ 相机跟随
- ✅ 鸡蛋发射器
- ✅ 胶囊体物理碰撞

### **其他用户 (StaticMMDModelManager)**
- ✅ 模型列表管理
- ✅ 昵称标签管理
- ✅ 自动资源清理
- ✅ 支持MMD和GLTF模型
- ❌ 无物理计算
- ❌ 无键盘控制
- ❌ 无相机跟随

## 💡 **性能优势**

1. **内存优化**: 其他用户的模型无物理系统，节省大量内存
2. **CPU优化**: 无物理计算，减少CPU负载
3. **网络优化**: 只需同步位置和动画状态
4. **扩展性**: 可以轻松支持更多用户

## 🔧 **调试和监控**

```typescript
// 获取模型状态
console.log('静态模型数量:', staticModelManager.getModelCount());
console.log('已加载的用户:', staticModelManager.getAllUserIds());

// 检查特定用户
const isLoaded = staticModelManager.isModelLoaded('user123');
console.log('用户123模型已加载:', isLoaded);

// 获取模型实例
const model = staticModelManager.getUserModel('user123');
if (model) {
  console.log('用户123模型位置:', model.getPosition());
}
```

## 🎉 **总结**

现在你有了一个完整的双管理器架构：

- **StaticMMDModelManager**: 管理其他用户的静态模型，包含模型列表管理和昵称标签
- **MMDModelManager**: 管理主机用户的完整模型，包含物理和控制
- **完全分离**: 静态模型无物理，主机模型有完整功能
- **资源安全**: 正确的清理和dispose调用链
- **性能优化**: 针对多用户场景优化

这个架构完全符合你的要求：**主机A创建有物理的人物模型，其他用户创建没有物理的静态模型**！
