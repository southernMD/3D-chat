# 彩蛋管理重构 - 移至ObjectManager

## 概述
将彩蛋广播处理和3D场景插入逻辑从3DChatRoom.vue重构到ObjectManager.ts中，实现更好的架构分离和代码复用。

## 重构内容

### 1. ObjectManager.ts 新增功能

#### 新增导入
```typescript
import type { EggBroadcastData } from '@/utils/eventBus';
import { showInfo } from '@/utils/message';
```

#### 新增属性
```typescript
// 彩蛋管理
private eggs: Map<string, THREE.Group> = new Map();
private eggAnimations: Map<string, () => void> = new Map();
```

#### 核心方法

##### 1. createEggBroadcast (公共方法)
```typescript
createEggBroadcast = (data: EggBroadcastData) => {
  console.log('🥚 ObjectManager收到彩蛋广播:', data)
  
  // 在3D场景中插入彩蛋
  data.eggs.forEach(egg => {
    this.insertEggIntoScene(egg.id, egg.x, egg.y, egg.z)
  })
  
  showInfo(`场景中新增了 ${data.totalEggs} 个彩蛋！`)
}
```

##### 2. insertEggIntoScene (私有方法)
- 创建彩蛋组 (THREE.Group)
- 创建金黄色球体网格
- 添加发光效果
- 实现旋转动画
- 管理彩蛋生命周期

##### 3. 彩蛋管理方法
- `clearEgg(eggId: string)` - 清除指定彩蛋
- `clearAllEggs()` - 清除所有彩蛋
- `getEggCount()` - 获取彩蛋数量
- `getEggIds()` - 获取所有彩蛋ID

### 2. 3DChatRoom.vue 修改

#### 移除的内容
- `createEggBroadcast` 函数
- `insertEggIntoScene` 函数
- `EggBroadcastData` 类型导入

#### 修改的内容
```typescript
// 修改前
eventBus.on('egg-broadcast', createEggBroadcast)

// 修改后
if(webrtcStore.roomConfig?.map === 'school') {
  eventBus.on('egg-broadcast', objectManager.createEggBroadcast)
}
```

```typescript
// 清理事件监听器
if(webrtcStore.roomConfig?.map === 'school') {
  eventBus.off('egg-broadcast', objectManager.createEggBroadcast)
}
```

## 架构优势

### 1. 职责分离
- **3DChatRoom.vue**: 负责页面逻辑和事件协调
- **ObjectManager.ts**: 负责3D对象的创建、管理和销毁

### 2. 代码复用
- 彩蛋管理逻辑可以在其他场景中复用
- 统一的3D对象管理接口

### 3. 更好的封装
- 彩蛋的创建、动画、清理都封装在ObjectManager中
- 外部只需要调用简单的接口

### 4. 内存管理
- 统一的资源清理机制
- 避免内存泄漏

## 彩蛋功能特性

### 视觉效果
- **主体**: 金黄色球体 (0xFFD700)
- **发光**: 半透明黄色光晕 (0xFFFF00)
- **动画**: 主体和光晕反向旋转
- **尺寸**: 主体半径2，光晕半径2.5

### 数据结构
```typescript
// 彩蛋组结构
eggGroup: THREE.Group {
  name: `egg_${id}`,
  userData: { type: 'egg', id: id },
  children: [eggMesh, glowMesh]
}
```

### 管理机制
- 使用Map存储彩蛋实例和动画函数
- 支持按ID查找和删除
- 自动清理几何体和材质资源

## 使用方式

### 在3D场景中
```typescript
// ObjectManager会自动处理彩蛋广播
// 无需手动调用，事件总线会自动触发

// 手动管理彩蛋（可选）
objectManager.clearEgg('egg_123')
objectManager.clearAllEggs()
console.log('当前彩蛋数量:', objectManager.getEggCount())
```

### 事件流程
```
服务器广播 → WebRTC接收 → 事件总线 → ObjectManager.createEggBroadcast → 3D场景更新
```

## 性能优化

### 1. 资源管理
- 自动清理不再使用的几何体和材质
- 停止已删除彩蛋的动画循环

### 2. 动画优化
- 使用requestAnimationFrame实现流畅动画
- 动画函数引用管理，避免内存泄漏

### 3. 批量操作
- 支持批量清除彩蛋
- 统一的错误处理机制

## 扩展性

### 1. 彩蛋类型
可以轻松扩展支持不同类型的彩蛋：
```typescript
private insertEggIntoScene(id: string, x: number, y: number, z: number, type?: string) {
  // 根据type创建不同样式的彩蛋
}
```

### 2. 交互功能
可以添加点击、碰撞等交互：
```typescript
// 添加点击事件
eggMesh.addEventListener('click', () => {
  this.collectEgg(id)
})
```

### 3. 特效增强
- 粒子效果
- 声音效果
- 更复杂的动画

## 测试验证

### 验证步骤
1. 创建school类型房间
2. 等待彩蛋广播
3. 检查ObjectManager是否正确创建彩蛋
4. 验证彩蛋动画和视觉效果
5. 测试彩蛋清理功能

### 预期结果
- 彩蛋在指定位置正确显示
- 旋转动画流畅运行
- 资源正确清理，无内存泄漏
- 控制台输出正确的日志信息

## 注意事项

1. **事件监听**: 只在school地图中监听彩蛋事件
2. **资源清理**: 确保在页面卸载时清理所有彩蛋
3. **错误处理**: 添加完整的错误处理和日志记录
4. **性能监控**: 监控彩蛋数量，避免过多影响性能

## 后续优化

1. **彩蛋池**: 实现对象池模式，复用彩蛋实例
2. **LOD系统**: 根据距离调整彩蛋细节级别
3. **批量渲染**: 使用InstancedMesh优化大量彩蛋渲染
4. **空间索引**: 实现空间分割，优化彩蛋查找和碰撞检测
