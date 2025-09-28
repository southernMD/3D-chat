# Model 重构总结

## 重构目标
将 Model.ts 拆分为两个类：
1. **StaticModel**: 处理静态模型功能（几何、包围盒、动画播放）
2. **Model**: 继承 StaticModel，处理动态功能（物理、操作控制、相机）

## 重构内容

### StaticModel 类
**职责**: 静态模型相关功能
- ✅ 模型尺寸计算 (`getModelDimensions()`)
- ✅ 胶囊体几何形状创建 (`createCapsuleGeometry()`)
- ✅ 胶囊体可视化更新 (`updateCapsuleVisualPosition()`)
- ✅ 模型辅助器更新 (`updateModelHelpers()`)
- ✅ 胶囊体可视化切换 (`toggleCapsuleVisibility()`)
- ✅ 抽象方法：`update()`, `setModelDimensions()`, `startWalking()`, `stopWalking()`

**不包含**:
- ❌ BVH物理系统
- ❌ 物理胶囊体 (Capsule)
- ❌ 相机控制
- ❌ 键盘输入处理

### Model 类
**职责**: 动态操作和物理
- ✅ 继承 StaticModel
- ✅ BVH物理系统管理
- ✅ 物理胶囊体创建 (`createPhysicsCapsule()`)
- ✅ 物理胶囊体位置更新 (`updatePhysicsCapsulePosition()`)
- ✅ 键盘输入处理
- ✅ 相机控制和跟随
- ✅ 碰撞检测
- ✅ 鸡蛋发射功能

## 关键变化

### 构造函数
```typescript
// StaticModel
constructor() {
  this.modelSize = { width: 0, height: 0, depth: 0 };
}

// Model  
constructor(bvhPhysics: BVHPhysics) {
  super(); // 不传递物理系统给父类
  this.bvhPhysics = bvhPhysics; // 在Model中管理物理
}
```

### 胶囊体处理
```typescript
// StaticModel: 只创建几何形状
createCapsuleGeometry(): { capsuleInfo, capsuleVisual }

// Model: 基于几何信息创建物理胶囊体
createPhysicsCapsule(): Capsule
```

### 子类更新
- ✅ MMDModel: 更新胶囊体创建调用
- ✅ GLTFModel: 更新胶囊体创建调用

## 验证要点
1. 编译无错误 ✅
2. StaticModel 不包含物理系统 ✅
3. Model 正确管理物理和动态功能 ✅
4. 子类正确调用新的方法 ✅
5. 功能分离清晰 ✅

## 优势
1. **职责分离**: 静态功能与动态功能分离
2. **可复用性**: StaticModel 可用于纯展示场景
3. **可维护性**: 代码结构更清晰
4. **扩展性**: 更容易添加新的静态或动态功能
