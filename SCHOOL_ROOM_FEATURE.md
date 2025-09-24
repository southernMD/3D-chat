# SchoolRoom 学校房间功能

## 功能概述
SchoolRoom类为学校类型的房间提供特殊功能，包括周期性广播彩蛋位置和客户端清除彩蛋标记的功能。

## 核心功能

### 1. 自动彩蛋广播
- **周期性广播**：每30秒自动广播未标记的彩蛋位置
- **随机选择**：每次随机选择1-3个彩蛋进行广播
- **标记管理**：广播的彩蛋会被标记，避免重复广播
- **智能过滤**：只广播未标记过的彩蛋位置

### 2. 客户端交互
- **清除标记**：客户端可以通过socket事件清除彩蛋标记
- **状态同步**：清除操作会广播给房间内所有用户
- **统计查询**：提供房间彩蛋统计信息查询

### 3. 房间管理
- **自动实例化**：当房间类型为'school'时自动创建SchoolRoom实例
- **生命周期管理**：房间删除时自动清理SchoolRoom实例
- **资源清理**：停止定时器和清理相关资源

## 技术实现

### 1. SchoolRoom类 (`src/lib/shcoolRoom.ts`)

#### 核心属性：
```typescript
export class SchoolRoom {
  private roomId: string;                    // 房间ID
  private io: Server;                        // Socket.IO实例
  private eggPositions: EggPosition[];       // 彩蛋位置数组
  private broadcastInterval: NodeJS.Timeout; // 广播定时器
  private readonly BROADCAST_INTERVAL = 30000; // 30秒间隔
  private readonly MAX_EGGS_PER_BROADCAST = 3; // 每次最多3个彩蛋
}
```

#### 主要方法：
- `startBroadcast()`: 启动周期性广播
- `stopBroadcast()`: 停止周期性广播
- `clearEggMark(eggId, playerId)`: 清除彩蛋标记
- `getStats()`: 获取统计信息
- `resetAllEggs()`: 重置所有彩蛋（管理员功能）
- `destroy()`: 销毁实例

### 2. 房间类型扩展 (`src/lib/room.ts`)

#### 新增枚举：
```typescript
export enum RoomType {
  DEFAULT = 'default',
  SCHOOL = 'school'
}
```

#### RoomConfig接口扩展：
```typescript
export interface RoomConfig {
  // ... 原有字段
  type?: RoomType; // 新增房间类型字段
}
```

#### Room接口扩展：
```typescript
export interface Room {
  // ... 原有字段
  schoolRoom?: SchoolRoom; // 学校房间实例
}
```

### 3. Socket事件处理 (`src/controllers/socket-controller.ts`)

#### 新增Socket事件：

**清除彩蛋标记**：
```typescript
socket.on('clearEgg', (data: { eggId: string, playerId: string }, callback) => {
  // 验证用户和房间
  // 调用SchoolRoom.clearEggMark()
  // 返回操作结果
});
```

**获取统计信息**：
```typescript
socket.on('getSchoolRoomStats', (callback) => {
  // 获取房间统计信息
  // 返回彩蛋数量和状态
});
```

## Socket事件协议

### 1. 服务器 → 客户端事件

#### `eggBroadcast` - 彩蛋广播
```typescript
{
  eggs: Array<{
    id: string;      // 彩蛋唯一ID
    x: number;       // X坐标
    y: number;       // Y坐标
    z: number;       // Z坐标
    timestamp: Date; // 广播时间
  }>;
  roomId: string;           // 房间ID
  totalEggs: number;        // 本次广播彩蛋数量
  remainingEggs: number;    // 剩余未标记彩蛋数量
}
```

#### `eggCleared` - 彩蛋被清除
```typescript
{
  eggId: string;           // 被清除的彩蛋ID
  clearedBy: string;       // 清除者ID
  timestamp: Date;         // 清除时间
  remainingEggs: number;   // 剩余未标记彩蛋数量
}
```

#### `eggsReset` - 彩蛋重置（管理员功能）
```typescript
{
  roomId: string;     // 房间ID
  timestamp: Date;    // 重置时间
  totalEggs: number;  // 总彩蛋数量
}
```

### 2. 客户端 → 服务器事件

#### `clearEgg` - 清除彩蛋标记
```typescript
// 发送数据
{
  eggId: string;    // 要清除的彩蛋ID
  playerId: string; // 玩家ID
}

// 回调响应
{
  success: boolean;
  error?: string;
}
```

#### `getSchoolRoomStats` - 获取统计信息
```typescript
// 回调响应
{
  success: boolean;
  stats?: {
    totalEggs: number;     // 总彩蛋数量
    markedEggs: number;    // 已标记彩蛋数量
    unmarkedEggs: number;  // 未标记彩蛋数量
    isActive: boolean;     // 广播是否活跃
  };
  error?: string;
}
```

## 使用方法

### 1. 创建学校房间
```typescript
// 客户端创建房间时指定类型
const roomConfig = {
  name: "我的学校",
  description: "学校类型房间",
  maxUsers: "20",
  isPrivate: false,
  enableVoice: true,
  enableText: true,
  map: "school_map",
  type: "school"  // 指定为学校类型
};

socket.emit('createOrJoin', {
  userName: "玩家名称",
  roomConfig: roomConfig,
  modelHash: "model_hash"
});
```

### 2. 监听彩蛋广播
```typescript
socket.on('eggBroadcast', (data) => {
  console.log(`收到${data.totalEggs}个彩蛋位置`);
  data.eggs.forEach(egg => {
    // 在3D场景中显示彩蛋
    showEggInScene(egg.x, egg.y, egg.z, egg.id);
  });
});
```

### 3. 清除彩蛋标记
```typescript
socket.emit('clearEgg', {
  eggId: 'egg_123',
  playerId: 'player_456'
}, (response) => {
  if (response.success) {
    console.log('彩蛋标记清除成功');
  } else {
    console.error('清除失败:', response.error);
  }
});
```

### 4. 监听彩蛋清除事件
```typescript
socket.on('eggCleared', (data) => {
  console.log(`彩蛋${data.eggId}被${data.clearedBy}清除`);
  // 从3D场景中移除彩蛋
  removeEggFromScene(data.eggId);
});
```

## 配置参数

### SchoolRoom配置
- `BROADCAST_INTERVAL`: 广播间隔（默认30秒）
- `MAX_EGGS_PER_BROADCAST`: 每次最大广播数量（默认3个）

### 彩蛋数据源
- 位置数据来源：`src/utils/eggPositions.ts`
- 总计29个预定义位置
- 每个位置包含x、y、z坐标

## 注意事项

1. **房间类型检查**：只有type为'school'的房间才会创建SchoolRoom实例
2. **资源清理**：房间删除时会自动停止广播定时器
3. **并发安全**：使用标记机制避免重复广播同一彩蛋
4. **错误处理**：所有socket事件都包含完整的错误处理
5. **日志记录**：详细的控制台日志便于调试和监控

## 扩展功能

### 管理员功能
- `resetAllEggs()`: 重置所有彩蛋标记
- `getStats()`: 获取详细统计信息

### 未来扩展
- 彩蛋收集积分系统
- 自定义广播间隔
- 彩蛋类型和奖励系统
- 玩家彩蛋收集历史
