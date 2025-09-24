# 彩蛋简化 - 纯净鸡蛋模型 + 随机旋转

## 概述
简化彩蛋系统，移除所有复杂的光线、发光、闪烁效果，只保留纯净的鸡蛋3D模型和简单的随机旋转动画。

## 简化内容

### 移除的效果
- ❌ 点光源 (PointLight)
- ❌ 光线射线效果
- ❌ 发光光晕
- ❌ 材质发光效果
- ❌ 复杂的闪烁动画
- ❌ 光源强度变化
- ❌ 透明度变化
- ❌ 多层动画效果

### 保留的功能
- ✅ 真实的3D鸡蛋模型
- ✅ 简单的随机旋转
- ✅ 基本的资源管理
- ✅ 彩蛋创建和清理

## 核心实现

### 1. 简化的彩蛋创建
```typescript
private insertEggIntoScene(id: string, x: number, y: number, z: number) {
  // 获取鸡蛋模型实例
  const eggModel = Egg.getEggInstance()
  
  // 设置基本属性
  eggModel.name = `egg_${id}`
  eggModel.userData = { type: 'egg', id: id }
  eggModel.position.set(x, y, z)
  eggModel.scale.set(1, 1, 1)
  
  // 直接添加到场景
  this.scene.add(eggModel)
  
  // 保存引用
  this.eggs.set(id, eggModel)
}
```

### 2. 随机旋转动画
```typescript
// 生成随机旋转速度
const rotationSpeed = {
  x: (Math.random() - 0.5) * 0.04, // -0.02 到 0.02
  y: (Math.random() - 0.5) * 0.04,
  z: (Math.random() - 0.5) * 0.04
}

// 简单的旋转动画
const animate = () => {
  if (this.eggs.has(id)) {
    eggModel.rotation.x += rotationSpeed.x
    eggModel.rotation.y += rotationSpeed.y
    eggModel.rotation.z += rotationSpeed.z
    
    requestAnimationFrame(animate)
  }
}
```

### 3. 简化的资源清理
```typescript
clearEgg(eggId: string): boolean {
  const eggModel = this.eggs.get(eggId)
  if (eggModel) {
    // 从场景移除
    this.scene.remove(eggModel)
    
    // 清理资源
    eggModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        // 清理材质...
      }
    })
    
    // 清理引用
    this.eggs.delete(eggId)
    this.eggAnimations.delete(eggId)
  }
}
```

## 技术特点

### 1. 数据结构简化
```typescript
// 修改前：存储复杂的组
private eggs: Map<string, THREE.Group> = new Map()

// 修改后：直接存储模型
private eggs: Map<string, THREE.Object3D> = new Map()
```

### 2. 随机性
- **旋转轴**：X、Y、Z轴都有随机旋转
- **旋转速度**：每个轴的速度都是随机的
- **旋转方向**：可能正向或反向旋转

### 3. 性能优化
- **无光源计算**：不需要光照计算
- **无复杂材质**：使用原始材质
- **简单动画**：只有基础的旋转计算
- **内存友好**：最小的资源占用

## 旋转参数

### 速度范围
```typescript
const rotationSpeed = {
  x: (Math.random() - 0.5) * 0.04, // -0.02 到 +0.02 弧度/帧
  y: (Math.random() - 0.5) * 0.04, // -0.02 到 +0.02 弧度/帧  
  z: (Math.random() - 0.5) * 0.04  // -0.02 到 +0.02 弧度/帧
}
```

### 可调节参数
```typescript
const ROTATION_SPEED_MULTIPLIER = 0.04  // 旋转速度倍数
const MIN_ROTATION_SPEED = -0.02         // 最小旋转速度
const MAX_ROTATION_SPEED = 0.02          // 最大旋转速度
```

## 视觉效果

### 简洁美观
- **纯净模型**：展示鸡蛋的原始3D模型细节
- **自然旋转**：随机的多轴旋转看起来很自然
- **无干扰**：没有光线和特效的干扰

### 性能友好
- **低CPU占用**：只有简单的旋转计算
- **低GPU占用**：无光照和特效渲染
- **低内存占用**：最小的资源使用

### 兼容性好
- **设备友好**：在低端设备上也能流畅运行
- **浏览器兼容**：不依赖高级WebGL特性
- **稳定可靠**：简单的实现不容易出错

## 使用场景

### 1. 性能优先
- 低端设备
- 移动端浏览器
- 大量彩蛋场景

### 2. 简洁风格
- 极简主义设计
- 专注游戏玩法
- 减少视觉干扰

### 3. 稳定性要求
- 生产环境
- 长时间运行
- 关键业务场景

## 扩展可能

### 1. 旋转增强
```typescript
// 可以添加更复杂的旋转模式
const rotationPattern = Math.random() > 0.5 ? 'clockwise' : 'counterclockwise'
const rotationAxis = ['x', 'y', 'z'][Math.floor(Math.random() * 3)]
```

### 2. 位置动画
```typescript
// 可以添加轻微的位置浮动
eggModel.position.y += Math.sin(time) * 0.1
```

### 3. 缩放动画
```typescript
// 可以添加呼吸效果
const scale = 1 + Math.sin(time) * 0.05
eggModel.scale.set(scale, scale, scale)
```

## 对比总结

### 修改前（复杂版本）
- 🔴 多层光线效果
- 🔴 复杂动画系统
- 🔴 高性能要求
- 🔴 资源占用大

### 修改后（简化版本）
- 🟢 纯净鸡蛋模型
- 🟢 简单随机旋转
- 🟢 低性能要求
- 🟢 资源占用小
- 🟢 稳定可靠

现在彩蛋系统变得非常简洁和高效，只有纯净的3D鸡蛋模型在随机旋转！🥚🔄
