# 彩蛋广播功能集成指南

## 功能概述
通过事件总线机制，当WebRTC收到彩蛋广播后，自动触发3D场景中的彩蛋插入功能。

## 实现方案

### 1. 事件总线架构 (`src/utils/eventBus.ts`)

创建了一个类型安全的事件总线系统：

```typescript
// 事件类型定义
export interface EventBusEvents {
  'egg-broadcast': EggBroadcastData
  'egg-cleared': EggClearedData
}

// 彩蛋广播数据结构
export interface EggBroadcastData {
  eggs: Array<{
    id: string
    x: number
    y: number
    z: number
  }>
  roomId: string
  totalEggs: number
  remainingEggs: number
}
```

### 2. WebRTC Store集成 (`src/stores/webrtc.ts`)

在收到服务器彩蛋广播后，触发事件总线：

```typescript
(eggPositions: EggPosintions) => {
  // 显示系统消息
  addMessage(`啊哈哈鸡蛋来了,生成${eggPositions.totalEggs}个鸡蛋`, false, "系统")
  console.log(eggPositions, "啊哈哈鸡蛋来了");
  
  // 触发事件总线，通知外部组件处理彩蛋插入
  eventBus.emit('egg-broadcast', {
    eggs: eggPositions.eggs,
    roomId: eggPositions.roomId,
    totalEggs: eggPositions.totalEggs,
    remainingEggs: eggPositions.remainingEggs
  })
}
```

### 3. 3D场景集成 (`src/view/3DChatRoom.vue`)

在3D聊天室组件中监听事件并处理彩蛋插入：

```typescript
// 导入事件总线
import { eventBus, type EggBroadcastData } from '@/utils/eventBus';

// 在onMounted中注册事件监听
onMounted(async () => {
  // ... 其他初始化代码
  
  // 监听彩蛋广播事件
  eventBus.on('egg-broadcast', createEggBroadcast)
})

// 在onUnmounted中清理事件监听
onUnmounted(() => {
  // 清理事件总线监听器
  eventBus.off('egg-broadcast', createEggBroadcast)
})
```

## 核心功能函数

### 1. 彩蛋广播处理函数

```typescript
const createEggBroadcast = (data: EggBroadcastData) => {
  console.log('🥚 收到彩蛋广播:', data)
  
  // 在3D场景中插入彩蛋
  data.eggs.forEach(egg => {
    insertEggIntoScene(egg.id, egg.x, egg.y, egg.z)
  })
  
  showInfo(`场景中新增了 ${data.totalEggs} 个彩蛋！`)
}
```

### 2. 3D场景彩蛋插入函数

```typescript
const insertEggIntoScene = (id: string, x: number, y: number, z: number) => {
  try {
    // 创建彩蛋几何体（球体）
    const geometry = new THREE.SphereGeometry(2, 16, 12)
    
    // 创建彩蛋材质（金黄色）
    const material = new THREE.MeshPhongMaterial({
      color: 0xFFD700, // 金黄色
      shininess: 100,
      transparent: true,
      opacity: 0.9
    })
    
    // 创建彩蛋网格
    const eggMesh = new THREE.Mesh(geometry, material)
    eggMesh.position.set(x, y, z)
    eggMesh.name = `egg_${id}` // 设置名称便于后续查找和删除
    eggMesh.userData = { type: 'egg', id: id }
    
    // 添加发光效果
    const glowGeometry = new THREE.SphereGeometry(2.5, 16, 12)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.3
    })
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
    glowMesh.position.set(x, y, z)
    
    // 添加到场景
    scene.add(eggMesh)
    scene.add(glowMesh)
    
    // 添加旋转动画
    const animate = () => {
      eggMesh.rotation.y += 0.02
      glowMesh.rotation.y -= 0.01
      requestAnimationFrame(animate)
    }
    animate()
    
    console.log(`🥚 彩蛋 ${id} 已插入场景位置: (${x}, ${y}, ${z})`)
    
  } catch (error) {
    console.error(`❌ 插入彩蛋 ${id} 失败:`, error)
  }
}
```

## 工作流程

1. **服务器广播**：SchoolRoom每30秒广播彩蛋位置
2. **WebRTC接收**：客户端WebRTC接收到`eggBroadcast`事件
3. **系统消息**：显示系统消息通知用户
4. **事件触发**：通过事件总线触发`egg-broadcast`事件
5. **场景插入**：3D场景监听事件，调用`insertEggIntoScene`函数
6. **视觉效果**：在指定位置创建金黄色发光的旋转彩蛋

## 彩蛋视觉特效

- **形状**：球体几何体（半径2单位）
- **颜色**：金黄色 (#FFD700)
- **材质**：高光泽度的Phong材质
- **发光效果**：外层半透明黄色光晕
- **动画**：持续旋转动画
- **透明度**：主体90%，光晕30%

## 扩展功能

### 1. 彩蛋交互
可以添加点击事件处理彩蛋收集：

```typescript
// 在insertEggIntoScene函数中添加
eggMesh.addEventListener('click', () => {
  // 发送清除彩蛋请求到服务器
  socket.emit('clearEgg', { eggId: id, playerId: 'current_player_id' })
})
```

### 2. 彩蛋清除
监听彩蛋清除事件并从场景中移除：

```typescript
eventBus.on('egg-cleared', (data) => {
  const eggMesh = scene.getObjectByName(`egg_${data.eggId}`)
  if (eggMesh) {
    scene.remove(eggMesh)
  }
})
```

### 3. 自定义彩蛋样式
可以根据彩蛋类型创建不同的视觉效果：

```typescript
const createEggMaterial = (eggType: string) => {
  switch (eggType) {
    case 'golden':
      return new THREE.MeshPhongMaterial({ color: 0xFFD700 })
    case 'silver':
      return new THREE.MeshPhongMaterial({ color: 0xC0C0C0 })
    case 'rainbow':
      return new THREE.MeshPhongMaterial({ 
        color: 0xFFFFFF,
        map: createRainbowTexture()
      })
    default:
      return new THREE.MeshPhongMaterial({ color: 0xFFD700 })
  }
}
```

## 调试和监控

### 控制台日志
- `🥚 收到彩蛋广播:` - 收到广播事件
- `🥚 彩蛋 ${id} 已插入场景位置:` - 彩蛋插入成功
- `❌ 插入彩蛋 ${id} 失败:` - 彩蛋插入失败

### 用户提示
- 系统消息：`啊哈哈鸡蛋来了,生成${totalEggs}个鸡蛋`
- 成功提示：`场景中新增了 ${totalEggs} 个彩蛋！`

## 注意事项

1. **内存管理**：确保在组件卸载时清理事件监听器
2. **性能优化**：大量彩蛋时考虑使用InstancedMesh
3. **错误处理**：添加完整的错误处理和回退机制
4. **类型安全**：使用TypeScript确保类型安全
5. **事件清理**：避免内存泄漏，及时清理事件监听器

## 测试方法

1. 创建学校类型房间（`map: 'school'`）
2. 等待30秒观察彩蛋广播
3. 检查控制台日志确认事件触发
4. 观察3D场景中是否出现金黄色旋转彩蛋
5. 验证用户提示消息是否正确显示
