# 鸡蛋清除事件总线集成

## 概述
通过事件总线实现Model.ts和ObjectManager之间的解耦，当玩家拾取鸡蛋时，Model.ts发送事件通知ObjectManager进行鸡蛋清除操作。

## 架构改进

### 1. 修改前的问题
```typescript
// ❌ 直接在Model.ts中处理鸡蛋清除
onKeyPress: () => {
  this.bvhPhysics?.removeEggBVH(objectId)
  // 直接操作场景对象，违反了架构分离原则
  const scene = this.mesh.parent;
  const eggModel = scene.getObjectByName(`egg_${objectId}`);
  scene.remove(eggModel);
}
```

**问题**：
- Model.ts直接操作场景中的鸡蛋模型
- 违反了单一职责原则
- 代码耦合度高，难以维护

### 2. 修改后的架构
```typescript
// ✅ 通过事件总线解耦
onKeyPress: () => {
  // Model.ts只负责发送事件
  eventBus.emit('egg-clear', { eggId: objectId });
  
  // ObjectManager负责实际的清除操作
  // 通过事件监听器接收并处理
}
```

**优势**：
- 职责分离：Model.ts负责交互，ObjectManager负责管理
- 松耦合：通过事件总线通信
- 易扩展：可以添加更多监听器

## 技术实现

### 1. 事件总线类型扩展

#### eventBus.ts类型定义
```typescript
export interface EventBusEvents {
  'egg-broadcast': EggBroadcastData
  'egg-cleared': EggClearedData
  'egg-clear': EggClearData  // 新增
}

export interface EggClearData {
  eggId: string
}
```

### 2. Model.ts发送事件

#### 导入事件总线
```typescript
import { eventBus } from '@/utils/eventBus';
```

#### 发送清除事件
```typescript
onKeyPress: () => {
  console.log('拾取鸡蛋', objectId);
  KeyBoardMessageManager.hide();
  
  // 通过事件总线通知ObjectManager清除鸡蛋
  eventBus.emit('egg-clear', { eggId: objectId });
  
  // 从BVH物理系统中移除鸡蛋碰撞体
  this.bvhPhysics?.removeEggBVH(objectId)
  
  // 清理本地映射
  colliders.delete(objectId)
  this.mapUserPositionDistance.delete(objectId)
}
```

### 3. ObjectManager监听事件

#### 导入类型和事件总线
```typescript
import type { EggBroadcastData, EggClearData } from '@/utils/eventBus';
import { eventBus } from '@/utils/eventBus';
```

#### 构造函数中注册监听器
```typescript
constructor(scene: THREE.Scene) {
  this.scene = scene;
  
  // 监听鸡蛋清除事件
  eventBus.on('egg-clear', this.handleEggClear);
}
```

#### 事件处理方法
```typescript
/**
 * 处理鸡蛋清除事件
 */
handleEggClear = (data: EggClearData) => {
  console.log('🥚 ObjectManager收到鸡蛋清除请求:', data.eggId);
  const success = this.clearEgg(data.eggId);
  if (success) {
    console.log(`🥚 鸡蛋 ${data.eggId} 已成功清除`);
  } else {
    console.warn(`⚠️ 鸡蛋 ${data.eggId} 清除失败`);
  }
}
```

## 数据流程

### 1. 完整的鸡蛋清除流程
```
玩家按F键 → Model.ts.onKeyPress → eventBus.emit('egg-clear') → ObjectManager.handleEggClear → ObjectManager.clearEgg → 场景中移除鸡蛋
```

### 2. 详细步骤
1. **用户交互**：玩家靠近鸡蛋并按F键
2. **事件发送**：Model.ts发送'egg-clear'事件
3. **事件接收**：ObjectManager接收事件
4. **鸡蛋清除**：ObjectManager调用clearEgg方法
5. **场景更新**：鸡蛋从场景中移除
6. **资源清理**：清理几何体、材质等资源

### 3. 并行处理
```typescript
// Model.ts中的并行操作
eventBus.emit('egg-clear', { eggId: objectId });        // 通知ObjectManager
this.bvhPhysics?.removeEggBVH(objectId)                // 清理BVH碰撞体
colliders.delete(objectId)                             // 清理本地映射
this.mapUserPositionDistance.delete(objectId)          // 清理距离映射
```

## 调试信息

### 1. Model.ts日志
```
拾取鸡蛋 egg_001
```

### 2. ObjectManager日志
```
🥚 ObjectManager收到鸡蛋清除请求: egg_001
🥚 彩蛋 egg_001 已清除
🥚 鸡蛋 egg_001 已成功清除
```

### 3. BVHPhysics日志
```
🥚 鸡蛋 egg_001 BVH碰撞体已移除
```

## 错误处理

### 1. 鸡蛋不存在
```typescript
handleEggClear = (data: EggClearData) => {
  const success = this.clearEgg(data.eggId);
  if (!success) {
    console.warn(`⚠️ 鸡蛋 ${data.eggId} 清除失败`);
  }
}
```

### 2. 事件总线异常
```typescript
try {
  eventBus.emit('egg-clear', { eggId: objectId });
} catch (error) {
  console.error('❌ 发送鸡蛋清除事件失败:', error);
}
```

## 性能优化

### 1. 事件处理效率
- **箭头函数**：使用箭头函数保持this上下文
- **类型安全**：TypeScript类型检查确保数据正确性
- **异步处理**：事件处理不阻塞主线程

### 2. 内存管理
```typescript
// 如果需要清理事件监听器
dispose() {
  eventBus.off('egg-clear', this.handleEggClear);
}
```

## 扩展功能

### 1. 批量清除
```typescript
// 可以扩展为批量清除事件
export interface EggBatchClearData {
  eggIds: string[]
}

eventBus.emit('egg-batch-clear', { eggIds: ['egg_001', 'egg_002'] });
```

### 2. 清除反馈
```typescript
// 可以添加清除完成的反馈事件
export interface EggClearCompleteData {
  eggId: string
  success: boolean
  timestamp: Date
}

// ObjectManager清除完成后发送反馈
eventBus.emit('egg-clear-complete', { 
  eggId: data.eggId, 
  success: true, 
  timestamp: new Date() 
});
```

### 3. 统计信息
```typescript
// 可以添加统计信息事件
export interface EggStatsData {
  totalEggs: number
  collectedEggs: number
  remainingEggs: number
}

eventBus.emit('egg-stats-update', statsData);
```

## 测试验证

### 1. 功能测试
- ✅ 事件正确发送和接收
- ✅ 鸡蛋正确从场景中移除
- ✅ BVH碰撞体正确清理
- ✅ 本地映射正确清理

### 2. 错误处理测试
- ✅ 不存在的鸡蛋ID处理
- ✅ 重复清除请求处理
- ✅ 事件总线异常处理

### 3. 性能测试
- ✅ 事件处理不影响帧率
- ✅ 大量鸡蛋清除时性能稳定
- ✅ 内存使用正常

## 架构优势

### 1. 职责分离
- **Model.ts**：负责用户交互和物理碰撞
- **ObjectManager**：负责3D对象的生命周期管理
- **BVHPhysics**：负责物理碰撞体管理

### 2. 松耦合
- 组件间通过事件通信，不直接依赖
- 易于单元测试和模块替换
- 支持多个监听器同时处理同一事件

### 3. 可扩展性
- 可以轻松添加新的事件类型
- 支持插件式的功能扩展
- 便于添加日志、统计等横切关注点

现在鸡蛋清除功能通过事件总线实现了完美的架构分离！🥚📡🔧
