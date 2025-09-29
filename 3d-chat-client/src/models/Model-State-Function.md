# 📊 模型状态获取函数实现报告

## 🎯 **功能需求**

用户要求：
> "在Model内添加一个函数用于获取模型的状态，包括模型位置，模型旋转方向，模型正在播放的动画"

## ✅ **实现方案**

### **1. StaticModel 基类状态函数**

为 `StaticModel` 基类添加了 `getModelState()` 方法，返回静态模型的基础状态：

```typescript
public getModelState(): {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  animation: {
    currentAnimation: string;
    walkActionActive: boolean;
    standActionActive: boolean;
  };
  modelInfo: {
    dimensions: { width: number; height: number; depth: number };
    hasAnimations: boolean;
  };
}
```

### **2. Model 类扩展状态函数**

为 `Model` 类重写了 `getModelState()` 方法，扩展了静态模型状态，添加了物理信息：

```typescript
public getModelState(): {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  animation: {
    currentAnimation: string;
    walkActionActive: boolean;
    standActionActive: boolean;
    isWalking: boolean; // Model 类特有
  };
  modelInfo: {
    dimensions: { width: number; height: number; depth: number };
    hasAnimations: boolean;
  };
  physics: { // Model 类特有的物理信息
    isOnGround: boolean;
    velocity: { x: number; y: number; z: number };
  };
}
```

## 🔧 **详细功能说明**

### **位置信息 (position)**
- **x, y, z**: 模型在3D空间中的坐标
- **精度**: 保留3位小数
- **单位**: Three.js 世界坐标单位

### **旋转信息 (rotation)**
- **x, y, z**: 模型的旋转角度
- **单位**: 度数（从弧度转换）
- **精度**: 保留3位小数
- **范围**: 0-360度

### **动画信息 (animation)**
- **currentAnimation**: 当前播放的动画名称
  - `'walking'` - 正在播放走路动画
  - `'standing'` - 正在播放站立动画
  - `'none'` - 没有动画播放
- **walkActionActive**: 走路动画是否激活
- **standActionActive**: 站立动画是否激活
- **isWalking**: (仅Model类) 模型是否处于行走状态

### **模型信息 (modelInfo)**
- **dimensions**: 模型的三维尺寸
  - `width` - 宽度
  - `height` - 高度
  - `depth` - 深度
- **hasAnimations**: 模型是否包含动画系统

### **物理信息 (physics)** - 仅Model类
- **isOnGround**: 模型是否在地面上
- **velocity**: 模型的速度向量
  - `x, y, z` - 各轴向的速度分量

## 🎮 **使用示例**

### **获取主机用户模型状态**
```typescript
// 在 MMDModelManager 中
const model = mmdModelManager.getModel();
if (model) {
  const state = model.getModelState();
  console.log('模型位置:', state.position);
  console.log('模型旋转:', state.rotation);
  console.log('当前动画:', state.animation.currentAnimation);
  console.log('是否在地面:', state.physics.isOnGround);
  console.log('移动速度:', state.physics.velocity);
}
```

### **获取静态用户模型状态**
```typescript
// 在 StaticMMDModelManager 中
const staticModel = staticModelManager.getUserModel('user123');
if (staticModel) {
  const state = staticModel.getModelState();
  console.log('用户位置:', state.position);
  console.log('用户旋转:', state.rotation);
  console.log('当前动画:', state.animation.currentAnimation);
  console.log('模型尺寸:', state.modelInfo.dimensions);
}
```

### **实时状态监控**
```typescript
// 在动画循环中监控状态
function animate() {
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    const state = model.getModelState();
    
    // 更新UI显示
    updatePositionDisplay(state.position);
    updateAnimationDisplay(state.animation.currentAnimation);
    updatePhysicsDisplay(state.physics);
  }
  
  requestAnimationFrame(animate);
}
```

## 🔍 **技术实现细节**

### **动画状态检测**
```typescript
protected getWalkActionActive(): boolean {
  const model = this as any;
  if (model.walkAction) {
    return model.walkAction.isRunning() && model.walkAction.getEffectiveWeight() > 0;
  }
  return false;
}

protected getStandActionActive(): boolean {
  const model = this as any;
  if (model.standAction) {
    return model.standAction.isRunning() && model.standAction.getEffectiveWeight() > 0;
  }
  return false;
}
```

### **坐标转换**
- **位置**: 直接从 `mesh.position` 获取
- **旋转**: 从弧度转换为度数 `(rotation * 180 / Math.PI)`
- **精度控制**: 使用 `toFixed(3)` 保留3位小数

### **类型安全**
- 所有返回值都有明确的 TypeScript 类型定义
- 处理了 `mesh` 可能为空的情况
- 提供了默认值防止运行时错误

## 🎉 **应用场景**

1. **调试和开发** - 实时监控模型状态
2. **网络同步** - 获取状态数据发送给其他用户
3. **UI显示** - 在界面上显示角色信息
4. **游戏逻辑** - 基于模型状态做游戏判断
5. **性能分析** - 监控物理和动画性能
6. **状态保存** - 保存用户的当前状态

## 💡 **扩展性**

这个状态函数设计具有良好的扩展性：
- 可以在子类中重写 `getWalkActionActive()` 和 `getStandActionActive()` 方法
- 可以在返回对象中添加更多状态信息
- 支持不同类型的模型（MMD、GLTF）
- 兼容静态模型和动态模型

现在你可以随时获取模型的完整状态信息，包括位置、旋转、动画和物理状态！🚀
