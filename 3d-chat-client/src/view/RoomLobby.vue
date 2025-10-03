<template>
  <div class="lobby-container">
    <!-- 内容包装器 -->
    <div class="content-wrapper">
      <!-- 头部导航 -->
      <header class="lobby-header">
      <div class="header-content">
        <button class="back-button" @click="goBack">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
          </svg>
          {{ $t('common.back') }}
        </button>
        <h1 class="lobby-title">{{ $t('lobby.title') }}</h1>
        <div class="header-spacer"></div>
      </div>
    </header>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <div class="search-container">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="$t('lobby.searchPlaceholder')"
          />
        </div>
        
        <div class="filter-buttons">
          <button
            v-for="filter in filters"
            :key="filter.key"
            :class="['filter-btn', { active: activeFilter === filter.key }]"
            @click="setFilter(filter.key)"
          >
            {{ $t(filter.label) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 房间列表 -->
    <div class="rooms-section">
      <div class="rooms-grid">
        <div
          v-for="room in filteredRooms"
          :key="room.id"
          :class="['room-card', { 'private-room': room.config?.isPrivate}]"
          @click="joinRoom(room)"
        >
          <div class="room-image">
            <img :src="`/${room.config.map}.png`" :alt="room.config.name" />
            <div v-if="room.config?.isPrivate" class="private-badge">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18,8H17V6A5,5 0 0,0 12,1A5,5 0 0,0 7,6V8H6A2,2 0 0,0 4,10V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V10A2,2 0 0,0 18,8M12,3A3,3 0 0,1 15,6V8H9V6A3,3 0 0,1 12,3Z"/>
              </svg>
              私密
            </div>
          </div>
          
          <div class="room-info">
            <h3 class="room-name">{{ room.config.name }}</h3>
            <p class="room-description">{{ room.config.description || $t('lobby.noDescription') }}</p>
            
            <div class="room-meta">
              <div class="room-users">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.996 1.996 0 0 0 18.06 7h-.72c-.8 0-1.54.5-1.85 1.26l-1.92 5.79c-.16.5.08 1.04.56 1.26l2.87.87V18h-2v3h4v-3h-1zm-12.5-11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S6 8.17 6 9s.67 1.5 1.5 1.5zM5.5 12h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5zm0 4h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5zm0-8h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5z"/>
                </svg>
                {{ room.onlineNumber }}/{{ room.config.maxUsers }}
              </div>
              <div class="room-map-label">{{ room.config.map }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="filteredRooms.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h3>{{ $t('lobby.empty.title') }}</h3>
        <p>{{ $t('lobby.empty.description') }}</p>
      </div>
    </div>
    
    <!-- PIN码输入对话框 -->
    <div v-if="showPinDialog" class="pin-dialog-overlay" @click.self="closePinDialog">
      <div class="pin-dialog">
        <div class="pin-dialog-header">
          <h3>输入PIN码</h3>
          <button class="close-btn" @click="closePinDialog">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>
        
        <div class="pin-dialog-content">
          <p>请输入房间 "{{ selectedRoom?.name }}" 的PIN码：</p>
          
          <div class="pin-input-group">
            <input
              v-model="pinInput"
              type="password"
              class="pin-input"
              placeholder="请输入PIN码"
              maxlength="10"
              @keyup.enter="confirmPin"
              autofocus
            />
          </div>
          
          <div v-if="pinError" class="pin-error">
            {{ pinError }}
          </div>
          
          <div class="pin-dialog-buttons">
            <button class="pin-btn cancel-btn" @click="closePinDialog">取消</button>
            <button class="pin-btn confirm-btn" @click="confirmPin" :disabled="!pinInput.trim()">确认</button>
          </div>
        </div>
      </div>
    </div>
    </div> <!-- content-wrapper 结束 -->
  </div>
</template>

<script setup lang="ts">
import { checkRoomExists, getRoomList, type RoomInfo } from '@/api/roomApi'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const activeFilter = ref('all')
const showPinDialog = ref(false)
const selectedRoom = ref<RoomInfo | null>(null)
const pinInput = ref('')
const pinError = ref('')

// 筛选选项
const filters = [
  { key: 'all', label: 'lobby.filters.all' },
  { key: 'public', label: 'lobby.filters.public' },
  { key: 'private', label: 'lobby.filters.private' }
]

// 房间数据（从后端获取）
const rooms = ref<RoomInfo[]>([])

// 计算过滤后的房间
const filteredRooms = computed(() => {
  let filtered = rooms.value
  // 根据搜索词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(room =>
      room.config.name?.toLowerCase().includes(query) ||
      room.config.description?.toLowerCase().includes(query)
    )
  }
  // 根据筛选条件过滤
  if (activeFilter.value === 'public') {
    filtered = filtered.filter(room => room.config?.isPrivate === false)
  } else if (activeFilter.value === 'private') {
    filtered = filtered.filter(room => room.config?.isPrivate === true)
  }
  return filtered
})

// 设置筛选条件
const setFilter = (filter: string) => {
  activeFilter.value = filter
}

// 加入房间
const joinRoom = async (room: RoomInfo) => {
  if (room.config?.isPrivate) {
    selectedRoom.value = room
    showPinDialog.value = true
    pinInput.value = ''
    pinError.value = ''
  } else {
    console.log('加入公开房间:', room.config.name)
    // 这里可以添加加入房间的逻辑
    const response = await checkRoomExists(room.id)

    if (!response.success) {
      throw new Error(response.message)
    }
    router.push({
      path: '/model-selection',
      query: {
        pingCode: room.id
      }
    })
  }
}

// 确认PIN码
const confirmPin = () => {
  if (!selectedRoom.value) return
  if (pinInput.value === selectedRoom.value.pinCode) {
    console.log('加入私密房间:', selectedRoom.value.config.name)
    closePinDialog()
    // 这里可以添加加入房间的逻辑
  } else {
    pinError.value = 'PIN码错误，请重新输入'
    pinInput.value = ''
  }
}

// 关闭PIN码对话框
const closePinDialog = () => {
  showPinDialog.value = false
  selectedRoom.value = null
  pinInput.value = ''
  pinError.value = ''
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 组件挂载，HTTP获取房间列表（用fetch）
onMounted(async () => {
  try {
    const res = await getRoomList()
    if(res.success){
      rooms.value = res.data?.rooms ?? []
      console.log(rooms.value);
    }else {
      console.error('获取房间列表失败')
    }
  } catch (e) {
    console.error('获取房间列表失败', e)
  }
})
</script>

<style scoped lang="less">
.lobby-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto; /* 显示滚动条 */
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 内容包装器 - 这是关键 */
.content-wrapper {
  display: flex;
  flex-direction: column;
  padding-top: 60px; /* 为TopBar留出空间 */
  /* 移除最小高度限制，让内容自然撑开高度 */
}

.lobby-header {
  padding: 20px 0;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  /* 移除sticky定位，简化布局 */
  z-index: 10;
  background: rgba(0, 0, 0, 0.3); /* 添加背景以提高可见性 */
}

.header-content {
  width: 100%;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 2px solid rgba(0, 255, 255, 0.3);
  color: #00ffff;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  
  svg {
    width: 20px;
    height: 20px;
  }
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
    transform: translateX(-5px);
  }
}

.lobby-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  margin: 0;
}

.header-spacer {
  width: 120px; /* 与返回按钮大致同宽，保持平衡 */
}

.search-section {
  padding: 40px 0;
  width: 100%;
  margin: 0 auto;
}

.search-container {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.search-input-wrapper {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.search-input {
  width: 100%;
  padding: 15px 20px 15px 55px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 25px;
  color: #ffffff;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
  }
}

.filter-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 12px 25px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 20px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
    transform: translateY(-2px);
  }
  
  &.active {
    background: linear-gradient(45deg, #00ffff, #ff00ff);
    border-color: transparent;
    color: #000000;
    font-weight: 600;
  }
}

.rooms-section {
  width: 100%;
  margin: 0 auto;
  padding: 0 20px 60px;
  /* 确保有足够的内容高度产生滚动 */
  min-height: 120vh;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(350px, 0.5fr));
  gap: 30px;
}

.room-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 255, 0.2);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateY(-10px);
    border-color: #00ffff;
    box-shadow: 0 20px 40px rgba(0, 255, 255, 0.2);
  }
  
  &.private-room {
    border-color: rgba(255, 0, 255, 0.3);
    background: rgba(255, 0, 255, 0.05);
    
    &:hover {
      border-color: #ff00ff;
      box-shadow: 0 20px 40px rgba(255, 0, 255, 0.2);
    }
  }
}

.room-image {
  position: relative;
  height: 200px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  .room-card:hover & img {
    transform: scale(1.1);
  }
}

.private-badge {
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 0, 255, 0.9);
  border-radius: 20px;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(255, 0, 255, 0.3);
  
  svg {
    width: 14px;
    height: 14px;
  }
}

.room-info {
  padding: 25px;
}

.room-name {
  font-size: 1.4rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 10px 0;
}

.room-description {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.room-meta {
  display: flex;
  justify-content: space-between; /* Changed to space-between */
  align-items: center;
  margin-bottom: 15px;
}

.room-users {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  
  svg {
    width: 16px;
    height: 16px;
  }
}

.room-map-label {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin: 0 0 10px 0;
}

.empty-state p {
  margin: 0;
  line-height: 1.5;
}

/* PIN码对话框样式 */
.pin-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.pin-dialog {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0a0a0a 100%);
  border: 2px solid rgba(255, 0, 255, 0.3);
  border-radius: 20px;
  padding: 0;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(255, 0, 255, 0.3);
  backdrop-filter: blur(10px);
  animation: pinDialogShow 0.3s ease;
}

@keyframes pinDialogShow {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.pin-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px 20px;
  border-bottom: 1px solid rgba(255, 0, 255, 0.2);
  
  h3 {
    color: #ff00ff;
    font-size: 1.4rem;
    margin: 0;
    font-weight: 600;
  }
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;
  
  svg {
    width: 20px;
    height: 20px;
  }
  
  &:hover {
    color: #ff00ff;
    background: rgba(255, 0, 255, 0.1);
  }
}

.pin-dialog-content {
  padding: 25px 30px 30px;
  
  p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 20px 0;
    font-size: 1rem;
    line-height: 1.5;
  }
}

.pin-input-group {
  margin-bottom: 15px;
}

.pin-input {
  width: 100%;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 0, 255, 0.3);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1.1rem;
  text-align: center;
  letter-spacing: 2px;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: normal;
  }
  
  &:focus {
    outline: none;
    border-color: #ff00ff;
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
  }
}

.pin-error {
  color: #ff4444;
  font-size: 0.9rem;
  margin-bottom: 15px;
  text-align: center;
  padding: 8px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 68, 68, 0.3);
}

.pin-dialog-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.pin-btn {
  padding: 12px 25px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
  }
  
  &.confirm-btn {
    background: linear-gradient(45deg, #ff00ff, #ff6bff);
    color: #ffffff;
    
    &:hover:not(:disabled) {
      background: linear-gradient(45deg, #ff6bff, #ff00ff);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(255, 0, 255, 0.4);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pin-dialog {
    min-width: 320px;
    margin: 20px;
  }
  
  .pin-dialog-header,
  .pin-dialog-content {
    padding-left: 20px;
    padding-right: 20px;
  }
  
  .pin-dialog-buttons {
    flex-direction: column;
    
    .pin-btn {
      width: 100%;
    }
  }
}

/* 原有样式继续... */
@media (max-width: 768px) {
  .lobby-title {
    font-size: 2rem;
  }
  
  .header-spacer {
    display: none;
  }
  
  .header-content {
    padding: 0 15px;
  }
  
  .search-container {
    padding: 0 15px;
  }
  
  .rooms-section {
    padding: 0 15px 40px;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .filter-buttons {
    gap: 10px;
  }
  
  .filter-btn {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .room-info {
    padding: 20px;
  }
  
  .room-meta {
    flex-direction: column;
    gap: 10px;
  }
}
</style>