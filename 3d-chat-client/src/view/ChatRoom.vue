<template>
  <div class="chat-room-container">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="room-info">
        <h3>{{ roomInfo.roomName }}</h3>
        <span class="room-id">房间ID: {{ roomInfo.roomId || '未连接' }}</span>
      </div>
      <div class="connection-status" :class="connectionStatus">
        <span class="status-dot"></span>
        <span class="status-text">{{ getStatusText() }}</span>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 3D场景区域 -->
      <!-- <div class="scene-container">
        <div class="scene-placeholder">
          <div class="scene-info">
            <h4>3D场景加载中...</h4>
            <p>模型: {{ modelInfo.name || '未知模型' }}</p>
            <p>地图: {{ roomConfig.map || '未知地图' }}</p>
          </div>
        </div>
      </div> -->

      <!-- 侧边栏 -->
      <div class="sidebar">
        <!-- 房间信息 -->
        <div class="room-info-panel">
          <h4>房间信息</h4>
          <div class="room-ping-code">
            <span>房间码: {{ roomPingCode }}</span>
            <button @click="copyPingCode" class="copy-button" title="复制房间码">
              📋
            </button>
          </div>
        </div>

        <!-- 成员列表 -->
        <div class="members-panel">
          <h4>在线成员 ({{ peers.length + 1 }})</h4>
          <div class="members-list">
            <div class="member-item self">
              <span class="member-name">{{ currentUserName }}</span>
            </div>
            <div
              v-for="peer in peers"
              :key="peer.id"
              class="member-item"
            >
              <span class="member-name">{{ peer.name }}</span>
            </div>
          </div>
        </div>

        <!-- 聊天面板 -->
        <div class="chat-panel">
          <h4>聊天</h4>
          <div class="chat-messages" ref="chatMessages">
            <div 
              v-for="message in messages" 
              :key="message.id"
              :class="['message', { 'own-message': message.isOwn }]"
            >
              <div class="message-header">
                <span class="sender">{{ message.sender }}</span>
                <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-content">{{ message.content }}</div>
            </div>
          </div>
          <div class="chat-input">
            <input
              v-model="newMessage"
              type="text"
              placeholder="输入消息..."
              @keypress.enter="sendMessage"
              :disabled="!isConnected"
            />
            <button 
              @click="sendMessage"
              :disabled="!isConnected || !newMessage.trim()"
              class="send-button"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <div class="controls-bar">
      <button 
        @click="toggleMicrophone"
        :class="['control-button', 'mic-button', { active: microphoneEnabled }]"
        :disabled="!isConnected"
      >
        <span class="icon">{{ microphoneEnabled ? '🎤' : '🔇' }}</span>
        <span class="label">{{ microphoneEnabled ? '关闭麦克风' : '开启麦克风' }}</span>
      </button>
      
      <button 
        @click="leaveRoom"
        class="control-button leave-button"
      >
        <span class="icon">🚪</span>
        <span class="label">离开房间</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
//@ts-nocheck
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showError, showSuccess, showInfo } from '@/utils/message'
import { useWebRTCStore } from '@/stores/webrtc'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const webrtcStore = useWebRTCStore()
const authStore = useAuthStore()

// 使用WebRTC store的状态
const connectionStatus = computed(() => webrtcStore.connectionStatus)
const roomInfo = computed(() => ({
  roomId: webrtcStore.roomInfo?.roomId || '',
  roomName: webrtcStore.currentRoomConfig?.name || '3D聊天室',
  peerId: webrtcStore.roomInfo?.peerId || ''
}))

const peers = computed(() => webrtcStore.peers)
const messages = computed(() => webrtcStore.messages)
const newMessage = ref('')
const microphoneEnabled = ref(false)

// 聊天消息容器引用
const chatMessages = ref<HTMLElement>()

// 计算属性
const isConnected = computed(() => webrtcStore.isConnected)
const roomPingCode = computed(() => webrtcStore.roomInfo?.roomId || '未知')
const currentUserName = computed(() => authStore.user?.username || '我')

// 方法
const getStatusText = () => {
  switch (connectionStatus.value) {
    case 'connecting': return '连接中...'
    case 'connected': return '已连接'
    case 'disconnected': return '未连接'
    default: return '未知状态'
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 这些回调函数现在由WebRTC store管理

const sendMessage = () => {
  if (!newMessage.value.trim()) return

  const success = webrtcStore.sendMessage(newMessage.value)
  if (success) {
    newMessage.value = ''
  }
}

// 复制房间ping码
const copyPingCode = async () => {
  try {
    await navigator.clipboard.writeText(roomPingCode.value)
    showSuccess('房间码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    showError('复制失败，请手动复制')
  }
}

const toggleMicrophone = async () => {
  try {
    const enabled = await webrtcStore.toggleMicrophone()
    microphoneEnabled.value = enabled
    console.log(`麦克风${enabled ? '已开启' : '已关闭'}`)
  } catch (error) {
    console.error('麦克风操作失败:', error)
    showError('麦克风操作失败')
  }
}

const leaveRoom = () => {
  webrtcStore.leaveRoom()
  router.push('/lobby')
}

// 监听成员变化
let previousPeerCount = 0

const watchPeersChange = () => {
  const currentPeerCount = peers.value.length

  if (previousPeerCount > 0) { // 不在初始化时显示
    if (currentPeerCount > previousPeerCount) {
      // 有新成员加入
      const newPeer = peers.value[peers.value.length - 1]
      if (newPeer) {
        showSuccess(`${newPeer.name} 加入了房间`)
      }
    } else if (currentPeerCount < previousPeerCount) {
      // 有成员离开
      showInfo('有成员离开了房间')
    }
  }

  previousPeerCount = currentPeerCount
}

// 生命周期
onMounted(() => {
  // 房间信息现在由WebRTC store管理
  console.log('聊天室页面已加载')
  console.log('当前房间状态:', webrtcStore.getStatusInfo())

  // 初始化成员数量
  previousPeerCount = peers.value.length

  // 监听成员变化
  watch(peers, watchPeersChange, { deep: true })
})

onUnmounted(() => {
  // WebRTC store在应用级别管理，这里不需要清理
  // 如果用户真的要离开应用，可以调用 webrtcStore.cleanup()
})
</script>

<style scoped lang="less">
.chat-room-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #ffffff;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.room-info h3 {
  margin: 0;
  color: #00ffff;
}

.room-id {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff6b6b;
}

.connection-status.connected .status-dot {
  background: #51cf66;
}

.connection-status.connecting .status-dot {
  background: #ffd43b;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
}

.scene-container {
  flex: 2;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-placeholder {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 300px;
}

.room-info-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 20px;
  margin-bottom: 20px;
}

.room-ping-code {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.9rem;
}

.copy-button {
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 6px;
  padding: 5px 8px;
  color: #00ffff;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.copy-button:hover {
  background: rgba(0, 255, 255, 0.3);
  transform: scale(1.1);
}

.members-panel, .chat-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 0, 255, 0.2);
  padding: 20px;
}

.members-panel {
  flex: 0 0 auto;
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.member-item.self {
  border: 1px solid rgba(0, 255, 255, 0.3);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin: 15px 0;
  padding-right: 10px;
}

.message {
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.message.own-message {
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.message.own-message .sender {
  color: #00ff00 !important;
  font-weight: bold;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.chat-input {
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #ffffff;
}

.send-button {
  padding: 10px 20px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  border: none;
  border-radius: 8px;
  color: #000000;
  font-weight: bold;
  cursor: pointer;
}

.controls-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(0, 255, 255, 0.2);
}

.control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-button.active {
  background: rgba(0, 255, 255, 0.2);
  border-color: #00ffff;
}

.leave-button {
  background: rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 0, 0, 0.5);
}

.leave-button:hover {
  background: rgba(255, 0, 0, 0.3);
}
</style>
