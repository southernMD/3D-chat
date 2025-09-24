# 地图默认选择修复

## 问题描述
在创建房间页面中，地图选择的默认值被设置为 `'space-station'`，但是在可用地图列表中只有 `'school'` 和 `'forest'`，导致没有默认选择的地图。

## 问题原因
在 `CreateRoom.vue` 文件中：

```typescript
// 地图数据
const maps = ref([
  {
    id: 'school',
    name: t('createRoom.map.school'),
    description: t('createRoom.map.schoolDescription'),
    preview: 'school',
    available: true,
    title: t('createRoom.map.school'),
  },
  {
    id: 'forest',
    name: t('createRoom.map.forestCabin'),
    description: t('createRoom.map.forestCabinDescription'),
    preview: 'forest',
    available: true,
    title: t('createRoom.map.forestCabin'),
  }
])

// 选中的地图 - 问题在这里！
const selectedMap = ref('space-station') // ❌ 不存在的地图ID
```

## 解决方案
将默认选中的地图改为存在的地图ID：

```typescript
// 选中的地图
const selectedMap = ref('school') // ✅ 默认选择school地图
```

## 修复效果

### 修复前：
- ❌ 没有默认选择的地图
- ❌ 用户需要手动选择地图才能创建房间
- ❌ 界面显示不一致

### 修复后：
- ✅ 默认选择school地图
- ✅ 用户可以直接创建房间（如果其他必填项已填写）
- ✅ 界面显示一致，school地图卡片会显示为选中状态

## 相关文件
- `server/3d-chat-client/src/view/CreateRoom.vue` - 创建房间页面

## 测试验证
1. 访问创建房间页面 (`/create-room`)
2. 检查地图选择区域
3. 验证school地图卡片是否显示为选中状态（蓝色边框和发光效果）
4. 验证右侧信息区域是否显示school地图的详细信息

## 扩展建议

### 1. 动态默认选择
可以改为动态选择第一个可用地图：

```typescript
// 选中的地图 - 动态选择第一个可用地图
const selectedMap = ref(maps.value[0]?.id || 'school')
```

### 2. 用户偏好记忆
可以记住用户上次选择的地图：

```typescript
// 从localStorage获取用户上次选择的地图
const getLastSelectedMap = () => {
  const lastMap = localStorage.getItem('lastSelectedMap')
  return maps.value.find(m => m.id === lastMap) ? lastMap : 'school'
}

const selectedMap = ref(getLastSelectedMap())

// 监听地图选择变化，保存到localStorage
watch(selectedMap, (newMap) => {
  localStorage.setItem('lastSelectedMap', newMap)
})
```

### 3. 地图可用性检查
添加地图可用性验证：

```typescript
const selectedMap = ref(() => {
  const availableMaps = maps.value.filter(m => m.available)
  return availableMaps[0]?.id || 'school'
})
```

## 注意事项
1. 确保默认选择的地图ID在maps数组中存在
2. 确保默认选择的地图的available属性为true
3. 如果添加新地图，考虑是否需要更新默认选择逻辑
