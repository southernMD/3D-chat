# 鸡蛋BVH物理系统集成

## 概述
在BVHPhysics类中为鸡蛋模型创建BVH（Bounding Volume Hierarchy）碰撞网络，实现精确的碰撞检测和物理交互。

## 核心功能

### 1. 鸡蛋BVH创建
```typescript
createEggBVH(eggId: string, eggModel: THREE.Object3D): THREE.Mesh | null
```

**功能**：
- 为指定鸡蛋创建BVH碰撞体
- 遍历鸡蛋模型的所有网格
- 合并几何体并生成BVH树
- 创建可视化碰撞体

**实现流程**：
1. **网格收集**：遍历鸡蛋模型，收集所有Mesh对象
2. **几何体克隆**：克隆网格并应用世界变换矩阵
3. **几何体合并**：使用StaticGeometryGenerator合并所有几何体
4. **BVH生成**：为合并后的几何体创建BVH树
5. **碰撞体创建**：创建带有BVH的碰撞网格
6. **可视化设置**：根据参数显示/隐藏碰撞体

### 2. 鸡蛋BVH移除
```typescript
removeEggBVH(eggId: string): void
```

**功能**：
- 从场景中移除鸡蛋的BVH碰撞体
- 清理几何体和材质资源
- 移除可视化器
- 清理内部映射关系

### 3. 碰撞检测
```typescript
checkEggCollisions(position: THREE.Vector3, radius: number = 1): string[]
```

**功能**：
- 检查指定位置是否与鸡蛋发生碰撞
- 返回碰撞的鸡蛋ID列表
- 支持自定义检测半径

## 技术实现

### 1. 几何体处理
```typescript
// 遍历鸡蛋模型，收集所有网格
eggModel.traverse((child: THREE.Object3D) => {
  if (child instanceof THREE.Mesh && child.geometry) {
    // 克隆网格并应用世界变换
    const clonedMesh = child.clone();
    clonedMesh.geometry = child.geometry.clone();
    
    // 应用鸡蛋模型的世界变换矩阵
    child.updateMatrixWorld(true);
    clonedMesh.applyMatrix4(child.matrixWorld);
    
    // 添加到鸡蛋碰撞组
    eggCollisionGroup.add(clonedMesh);
  }
});
```

### 2. BVH树生成
```typescript
// 使用StaticGeometryGenerator合并几何体
const staticGenerator = new StaticGeometryGenerator(eggCollisionGroup);
staticGenerator.attributes = ['position'];

const mergedGeometry = staticGenerator.generate();

// 创建BVH树
const bvh = new MeshBVH(mergedGeometry);
mergedGeometry.boundsTree = bvh;
```

### 3. 碰撞体配置
```typescript
// 创建碰撞体网格
const colliderMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.3,
  color: 0x00ff00,  // 绿色
  wireframe: true
});

const colliderMesh = new THREE.Mesh(mergedGeometry, colliderMaterial);
colliderMesh.name = `egg_collider_${eggId}`;
colliderMesh.userData = { type: 'egg_collider', eggId: eggId };
```

### 4. 位置同步
```typescript
// 设置碰撞体位置（与鸡蛋模型相同）
colliderMesh.position.copy(eggModel.position);
colliderMesh.rotation.copy(eggModel.rotation);
colliderMesh.scale.copy(eggModel.scale);
```

## 数据管理

### 1. 存储结构
```typescript
// 碰撞体映射
private colliders: Map<string, THREE.Mesh> = new Map();

// 可视化器映射
private visualizers: Map<string, MeshBVHHelper> = new Map();
```

### 2. 命名规范
- **碰撞体键名**：`egg_${eggId}`
- **碰撞体名称**：`egg_collider_${eggId}`
- **用户数据**：`{ type: 'egg_collider', eggId: eggId }`

## 可视化功能

### 1. 碰撞体可视化
```typescript
// 默认隐藏碰撞体
colliderMesh.visible = this.params.displayCollider;
```

### 2. BVH树可视化
```typescript
// 创建BVH可视化器
if (this.params.displayBVH) {
  const visualizer = new MeshBVHHelper(colliderMesh, this.params.visualizeDepth);
  visualizer.visible = this.params.displayBVH;
  this.scene.add(visualizer);
  this.visualizers.set(`egg_${eggId}`, visualizer);
}
```

## 性能优化

### 1. 几何体优化
- **属性限制**：只保留position属性，减少内存占用
- **几何体合并**：将多个网格合并为单一几何体
- **世界变换**：预先应用变换矩阵，避免运行时计算

### 2. 内存管理
- **资源清理**：及时dispose几何体和材质
- **引用管理**：使用Map存储，便于查找和清理
- **可视化控制**：按需创建可视化器

### 3. 碰撞检测优化
```typescript
// 简单距离检测，避免复杂的BVH查询
const distance = position.distanceTo(collider.position);
if (distance <= radius + 2) { // 2是鸡蛋的大致半径
  collidedEggs.push(eggId);
}
```

## 使用示例

### 1. 创建鸡蛋BVH
```typescript
// 在ObjectManager中调用
const bvhPhysics = new BVHPhysics(scene);
const eggModel = Egg.getEggInstance();
const collider = bvhPhysics.createEggBVH('egg_001', eggModel);
```

### 2. 碰撞检测
```typescript
// 检查玩家位置是否与鸡蛋碰撞
const playerPosition = new THREE.Vector3(x, y, z);
const collidedEggs = bvhPhysics.checkEggCollisions(playerPosition, 1.5);

if (collidedEggs.length > 0) {
  console.log('碰撞到鸡蛋:', collidedEggs);
}
```

### 3. 清理鸡蛋BVH
```typescript
// 鸡蛋被收集后清理BVH
bvhPhysics.removeEggBVH('egg_001');
```

## 调试功能

### 1. 控制台输出
```typescript
console.log(`🥚 开始为鸡蛋 ${eggId} 创建BVH碰撞体...`);
console.log(`✅ 鸡蛋 ${eggId} BVH碰撞体创建成功，包含 ${meshCount} 个网格`);
```

### 2. 可视化调试
- **displayCollider**：显示/隐藏碰撞体线框
- **displayBVH**：显示/隐藏BVH树结构
- **visualizeDepth**：控制BVH可视化深度

### 3. 错误处理
```typescript
try {
  // BVH创建逻辑
} catch (error) {
  console.error(`❌ 鸡蛋 ${eggId} BVH创建失败:`, error);
  return null;
}
```

## 集成要点

### 1. 与ObjectManager集成
- ObjectManager创建鸡蛋时调用createEggBVH
- ObjectManager删除鸡蛋时调用removeEggBVH
- 保持鸡蛋模型与BVH碰撞体的同步

### 2. 与游戏逻辑集成
- 玩家移动时检查鸡蛋碰撞
- 碰撞检测结果触发收集逻辑
- 支持不同类型的交互半径

### 3. 性能考虑
- 避免为每个鸡蛋创建过于复杂的BVH
- 合理设置可视化参数
- 及时清理不需要的碰撞体

## 扩展功能

### 1. 高级碰撞检测
```typescript
// 可以扩展为射线检测
raycastEgg(origin: THREE.Vector3, direction: THREE.Vector3): string[]

// 可以扩展为精确的BVH查询
preciseEggCollision(geometry: THREE.BufferGeometry): string[]
```

### 2. 动态更新
```typescript
// 如果鸡蛋位置发生变化，更新BVH
updateEggBVH(eggId: string, newPosition: THREE.Vector3): void
```

### 3. 批量操作
```typescript
// 批量创建多个鸡蛋的BVH
createMultipleEggBVH(eggs: Map<string, THREE.Object3D>): void
```

现在鸡蛋具有完整的BVH物理系统支持，可以进行精确的碰撞检测和物理交互！🥚🔧
