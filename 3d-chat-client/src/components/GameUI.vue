<template>
  <div class="game-ui">
    <!-- 左上角按钮区域 -->
    <div class="top-left-buttons">
      <button class="ui-button exit-btn" @click.stop="handleExit">
        <span class="button-icon">🚪</span>
        退出
      </button>
      <button class="ui-button copy-room-btn" @click.stop="handleCopyRoomCode" :disabled="!roomCode">
        <span class="button-icon">📋</span>
        复制房间码
      </button>
      <button class="ui-button settings-btn" @click.stop="handleSettings" v-if="webrtcStore.roomConfig?.hostId === webrtcStore.getYouPeer().id">
        <span class="button-icon">⚙️</span>
        设置
      </button>
      <button class="ui-button help-btn" @click.stop="handleHelp">
        <span class="button-icon">❓</span>
        帮助
      </button>
      <span
        class="feature-badge"
        :class="{ on: webrtcStore.roomConfig?.enableVoice, off: !webrtcStore.roomConfig?.enableVoice }"
        title="语音聊天是否开启"
      >
        语音: {{ webrtcStore.roomConfig?.enableVoice ? '开' : '关' }}
      </span>
      <span
        class="feature-badge"
        :class="{ on: webrtcStore.roomConfig?.enableText, off: !webrtcStore.roomConfig?.enableText }"
        title="文本聊天是否开启"
      >
        文本: {{ webrtcStore.roomConfig?.enableText ? '开' : '关' }}
      </span>
    </div>

    <!-- 帮助弹窗 -->
     <teleport to="body">
      <HelpModal v-if="showHelp" @close="showHelp = false" />
     </teleport>

    <!-- 右上角在线用户列表 -->
    <div class="online-users">
      <div class="users-header">
        <span class="users-title">在线用户 ({{ onlineUsers.length }})</span>
        <div class="connection-indicator" :class="{ 'connected': props.webrtcConnected }">
          <span class="connection-dot"></span>
          <span class="connection-text">{{ props.webrtcConnected ? '已连接' : '未连接' }}</span>
        </div>
      </div>
      <div class="users-list">
        <div 
          v-for="user in onlineUsers" 
          :key="user.id"
          class="user-item"
          :class="{ 'self': user.isSelf }"
        >
          <div class="user-avatar">{{ user.name.charAt(0) }}</div>
          <div class="user-info">
            <span class="user-name">{{ user.name }}{{webrtcStore.roomConfig?.hostId === user.id ||  user.id === 'self' && webrtcStore.roomConfig?.hostId === webrtcStore.getYouPeer().id?' (房主)':''}}</span>
            <div class="user-status">
              <!-- 麦克风按钮 -->
              <span
                class="mic-button"
                :class="{ 
                  'active': user.micOn,
                  'disabled': !user.isSelf
                }"
                @click.stop="user.isSelf ? toggleMicrophone(user.id) : null"
                :title="user.isSelf ? 
                  (user.micOn ? '点击关闭麦克风' : '点击开启麦克风') : 
                  (user.micOn ? '用户麦克风已开启' : '用户麦克风已关闭')"
              >
                <img 
                  :src="user.micOn ? '/m-open.png' : '/m-close.png'" 
                  :alt="user.micOn ? '麦克风开启' : '麦克风关闭'"
                  class="mic-icon"
                />
              </span>
              
              <!-- 声音按钮 -->
              <span
                class="sound-button"
                :class="{ 
                  'active': !user.isMuted,
                  'muted': user.isMuted
                }"
                @click.stop="toggleSound(user.id)"
                :title="user.isSelf ? 
                  (user.isMuted ? '点击取消静音所有人' : '点击静音所有人') : 
                  (user.isMuted ? '点击取消静音此用户' : '点击静音此用户')"
              >
                {{ user.isMuted ? '🔇' : '🔊' }}
              </span>
              
              <div class="volume-bar">
                <div 
                  class="volume-level" 
                  :style="{ width: user.volume + '%' }"
                ></div>
              </div>
              
              <!-- 踢人按钮 - 只有房主可以踢人，不能踢自己 -->
              <span
                v-if="webrtcStore.roomConfig?.hostId === webrtcStore.getYouPeer().id && !user.isSelf"
                class="kick-button"
                @click.stop="kickUser(user.id)"
                title="踢出用户"
              >
                ❌
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 左下角消息栏 -->
    <div class="lol-chat-area">
      <div class="lol-chat-messages" ref="chatMessagesRef">
        <div
          v-for="message in chatMessages"
          :key="message.id"
          class="lol-chat-message"
          :class="{ 'self': message.isSelf, 'system': message.isSystem }"
        >
          <span class="lol-message-time">{{ formatTime(message.timestamp) }}</span>
          <span class="lol-message-author" v-if="!message.isSystem">[{{ message.author }}]</span>
          <span class="lol-message-content">{{ message.content }}</span>
        </div>
      </div>
      <div class="lol-chat-input-area">
        <input
          ref="chatInputRef"
          v-model="currentMessage"
          @keyup.enter="sendMessage"
          @keyup.esc="hideChatInput"
          @keydown.stop
          @keyup.stop
          @keypress.stop
          @blur="hideChatInput"
          class="lol-chat-input"
          :class="{ 'hidden': !showChatInput }"
          :placeholder="props.webrtcConnected ? '按回车发送消息...' : '未连接到服务器'"
          :disabled="!props.webrtcConnected"
          maxlength="200"
        />
      </div>
    </div>

    <!-- 中间下方物品栏 -->
    <div class="inventory-bar">
      <div class="inventory-slots">
        <div 
          v-for="(item, index) in inventoryItems" 
          :key="index"
          class="inventory-slot"
          :class="{ 
            'selected': selectedSlot === index,
            'has-item': item.id !== null 
          }"
          @click.stop="selectSlot(index)"
        >
          <div v-if="item.id" class="item-icon">
            <span class="item-emoji">{{ item.icon }}</span>
            <span v-if="item.count >= 0" class="item-count">{{ item.count }}</span>
          </div>
          <div class="slot-number">{{ index + 1 }}</div>
        </div>
      </div>

    </div>

    <!-- 设置面板 -->
    <div v-if="showSettingsPanel" class="settings-overlay" @click="closeSettingsPanel">
      <div class="settings-panel" 
          @click.stop
          @keydown.stop
          @keyup.stop
          @keypress.stop>
        <div class="settings-header">
          <h3>房间设置</h3>
          <button class="close-btn" @click="closeSettingsPanel">×</button>
        </div>
        
        <div class="settings-content">
          <div class="setting-item">
            <label>房间名称</label>
            <input type="text" v-model="settingsForm.name" placeholder="输入房间名称">
          </div>
          
          <div class="setting-item">
            <label>房间描述</label>
            <input type="text" v-model="settingsForm.description" placeholder="输入房间描述">
          </div>
          
          <div class="setting-item">
            <label>启用文本聊天</label>
            <input type="checkbox" v-model="settingsForm.enableText">
          </div>
          
          <div class="setting-item">
            <label>启用语音聊天</label>
            <input type="checkbox" v-model="settingsForm.enableVoice">
          </div>
          
          <div class="setting-item">
            <label>房主</label>
            <select v-model="settingsForm.hostId">
              <option 
                v-for="user in availableHosts" 
                :key="user.id" 
                :value="user.id"
              >
                {{ user.name }}
              </option>
            </select>
          </div>
          
          <div class="setting-item">
            <label>最大房间人数</label>
            <select v-model="settingsForm.maxUsers">
              <option value="2">2人</option>
              <option value="4">4人</option>
              <option value="6">6人</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label>私有房间</label>
            <input type="checkbox" v-model="settingsForm.isPrivate">
          </div>
          
          <div v-if="settingsForm.isPrivate" class="setting-item">
            <label>房间密码</label>
            <div class="password-input-wrapper">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                v-model="settingsForm.password" 
                placeholder="输入房间密码"
                class="password-input"
              >
              <button 
                type="button" 
                class="password-toggle-btn" 
                @click="togglePasswordVisibility"
                :title="showPassword ? '隐藏密码' : '显示密码'"
              >
                {{ showPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="cancel-btn" @click="closeSettingsPanel">取消</button>
          <button class="save-btn" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { audioElementManager } from '@/utils/audioElementManager'
import { useWebRTCStore } from '@/stores/webrtc'
import { eventBus, type ChangeMicoStatus } from '@/utils/eventBus'
import { showError, showSuccess } from '@/utils/message'

const webrtcStore = useWebRTCStore()
// Props定义
interface Props {
  webrtcConnected?: boolean
  roomInfo?: any
  peers?: any[]
  messages?: any[]
  microphoneEnabled?: boolean
  userEquipment?: {
    egg: number
  }
  selectedSlot?: number
}

const props = withDefaults(defineProps<Props>(), {
  webrtcConnected: false,
  roomInfo: null,
  peers: () => [],
  messages: () => [],
  microphoneEnabled: false,
  userEquipment: () => ({ egg: 0 }),
  selectedSlot: 0
})

// Events定义
const emit = defineEmits<{
  sendMessage: [message: string]
  toggleMicrophone: [userPeerId: string]
  toggleSound: [userPeerId: string]
  exitRoom: []
  copyRoomCode: [success: boolean, roomCode?: string]
  slotSelection: [slotIndex: number]
  kickUser: [userPeerId: string]
}>()

// 接口定义
interface User {
  id: string
  name: string
  micOn: boolean
  volume: number
  isSelf: boolean
  isMuted?: boolean  // 添加本地静音状态
}

interface ChatMessage {
  id: string
  author: string
  content: string
  timestamp: number
  isSelf: boolean
  isSystem: boolean
}

interface InventoryItem {
  id: string | null
  name: string
  icon: string
  count: number
  description: string
}

// 实时音量数据（响应式）
const volumeLevels = ref<Map<string, number>>(new Map())

// 响应式数据 - 现在从WebRTC获取
const onlineUsers = computed<User[]>(() => {
  const users: User[] = []
  // 添加自己
  users.push({
    id: 'self',
    name: '我',
    micOn: props.microphoneEnabled || false,
    volume: volumeLevels.value.get('self') || 0, // 使用自己的实时音量检测
    isSelf: true,
    isMuted: audioElementManager.isMuted(webrtcStore.getYouPeer().id)
  })
  // 添加其他用户
  if (props.peers) {
    props.peers.forEach(peer => {
      users.push({
        id: peer.id,
        name: peer.name,
        micOn: peer.micOn, // 其他用户的麦克风状态
        volume: volumeLevels.value.get(peer.id) || 0, // 使用响应式音量数据
        isSelf: false,
        isMuted: audioElementManager.isMuted(peer.id)
      })
    })
  }
  return users
})

// 房间码计算属性
const roomCode = computed(() => {
  return props.roomInfo?.roomId || null
})

// 可选择的房主列表（包含自己和所有peers）
const availableHosts = computed(() => {
  const hosts = []
  
  // 添加自己
  hosts.push({
    id: webrtcStore.getYouPeer().id,
    name: '我'
  })
  
  // 添加其他用户
  if (props.peers) {
    props.peers.forEach(peer => {
      hosts.push({
        id: peer.id,
        name: peer.name
      })
    })
  }
  
  return hosts
})

const chatMessagesRef = ref()
const chatInputRef = ref()
const showChatInput = ref(false) // 默认隐藏输入框

// 聊天消息现在从WebRTC获取
const chatMessages = computed<ChatMessage[]>(() => {
  const messages: ChatMessage[] = []

  // 添加系统欢迎消息
  if (props.webrtcConnected) {
    messages.push({
      id: 'welcome',
      author: '系统',
      content: '欢迎进入3D聊天室！',
      timestamp: Date.now() - 120000,
      isSelf: false,
      isSystem: true
    })
  }

  // 添加WebRTC消息
  if (props.messages) {
    props.messages.forEach(msg => {
      messages.push({
        id: msg.id,
        author: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
        isSelf: msg.isOwn,
        isSystem: msg.isSystem || false
      })
    })
  }

  // 限制消息数量，只显示最近的50条消息
  return messages.slice(-50)
})

const currentMessage = ref('')

// 全局键盘监听
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // 按回车键显示聊天输入框（只有在输入框未显示时）
  if(!webrtcStore.roomConfig?.enableText)return
  if (event.key === 'Enter' && !showChatInput.value) {
    event.preventDefault()
    showChatInputBox()
  }
}

onMounted(() => {
  console.log('💬 GameUI组件已挂载')

  // 添加全局键盘监听
  document.addEventListener('keydown', handleGlobalKeydown)

  // 监听聊天消息变化，自动滚动到底部
  watch(chatMessages, () => {
    nextTick(() => {
      const chatContainer = document.querySelector('.lol-chat-messages')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    })
  }, { deep: true })
})

onUnmounted(() => {
  // 清理全局键盘监听
  document.removeEventListener('keydown', handleGlobalKeydown)
})
// 使用父组件传递的选中槽位，如果没有传递则默认为0
const selectedSlot = computed(() => props.selectedSlot || 0)

// 物品配置
const itemConfigs = [
  { id: 'egg', name: '鸡蛋', icon: '🥚', description: '没有特殊效果的投掷物', equipmentKey: 'egg' },
  // 可以在这里添加更多物品配置
]

// 初始化物品栏（9个槽位，类似MC）
const inventoryItems = ref<InventoryItem[]>(Array.from({ length: 9 }, (_, index) => {
  const itemConfig = itemConfigs[index]

  if (itemConfig) {
    return {
      id: itemConfig.id,
      name: itemConfig.name,
      icon: itemConfig.icon,
      count: props.userEquipment?.[itemConfig.equipmentKey as keyof typeof props.userEquipment] || 0,
      description: itemConfig.description
    }
  } else {
    // 空槽位
    return {
      id: null,
      name: '',
      icon: '',
      count: 0,
      description: ''
    }
  }
}))

// 监听装备数据变化，更新库存
watch(() => props.userEquipment, (newEquipment) => {
  if (!newEquipment) return

  // 遍历所有物品槽位，更新对应的装备数量
  inventoryItems.value.forEach((item, index) => {
    const itemConfig = itemConfigs[index]
    if (itemConfig && item.id === itemConfig.id) {
      const newCount = newEquipment[itemConfig.equipmentKey as keyof typeof newEquipment] || 0
      if (item.count !== newCount) {
        item.count = newCount
        console.log(`🎒 库存更新: ${itemConfig.name} = ${newCount}`)
      }
    }
  })
}, { immediate: true, deep: true })



// 方法
const handleExit = () => {
  if (confirm('确定要退出房间吗？')) {
    emit('exitRoom')
  }
}

const handleSettings = () => {
  console.log('打开设置',webrtcStore.roomConfig)
  if (!settingsForm.value.hostId) {
    settingsForm.value.hostId = webrtcStore.roomConfig!.hostId
  }
  showSettingsPanel.value = true
}

const closeSettingsPanel = () => {
  showSettingsPanel.value = false
}

const saveSettings = () => {
  // 验证最大房间人数不能小于当前房间人数
  const currentUserCount = onlineUsers.value.length
  if (Number(settingsForm.value.maxUsers) < currentUserCount) {
    alert(`最大房间人数不能小于当前房间人数（${currentUserCount}人）`)
    return
  }
  
  // 验证私有房间必须有密码
  if (settingsForm.value.isPrivate && !settingsForm.value.password.trim()) {
    alert('私有房间必须设置密码')
    return
  }
  
  // 保存设置到webrtcStore
  webrtcStore.updateRoomConfig({
    ...webrtcStore.roomConfig,
    ...settingsForm.value
  },({success,message}:any)=>{
    if(success){
      showSuccess(message)
    }else{
      showError(message)
    }
  })
  closeSettingsPanel()
  console.log('设置已保存:', settingsForm.value)
}

// 设置面板状态
const showSettingsPanel = ref(false)
const showPassword = ref(false)
const showHelp = ref(false)
const settingsForm = ref({
  name: '',
  description: '',
  enableText: true,
  enableVoice: true,
  hostId: '',
  maxUsers: '2',
  isPrivate: false,
  password: ''
})

const handleHelp = () => {
  console.log('打开帮助')
  showHelp.value = true
}

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const handleCopyRoomCode = async () => {
  if (!roomCode.value) {
    console.warn('⚠️ 房间码不存在')
    emit('copyRoomCode', false)
    return
  }

  try {
    await navigator.clipboard.writeText(roomCode.value)
    console.log('📋 房间码已复制:', roomCode.value)
    emit('copyRoomCode', true, roomCode.value)
  } catch (error) {
    console.error('❌ 复制房间码失败:', error)
    // 降级方案：选择文本
    try {
      const textArea = document.createElement('textarea')
      textArea.value = roomCode.value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      console.log('📋 房间码已复制（降级方案）:', roomCode.value)
      emit('copyRoomCode', true, roomCode.value)
    } catch (fallbackError) {
      console.error('❌ 降级复制方案也失败:', fallbackError)
      emit('copyRoomCode', false)
    }
  }
}

// 麦克风控制（只有自己可以操作）
const toggleMicrophone = (userId: string) => {
  if(!webrtcStore.roomConfig?.enableVoice)return
  if (userId === 'self') {
    emit('toggleMicrophone', userId)
  }
}

// 声音控制（所有人都可以操作）
const toggleSound = (userId: string) => {
  emit('toggleSound', userId)
}

// 踢人功能（只有房主可以操作）
const kickUser = (userId: string) => {
  // 再次确认权限：只有房主可以踢人，不能踢自己
  if (webrtcStore.roomConfig?.hostId !== webrtcStore.getYouPeer().id) {
    console.warn('⚠️ 只有房主可以踢人')
    return
  }
  
  if (userId === 'self' || userId === webrtcStore.getYouPeer().id) {
    console.warn('⚠️ 不能踢出自己')
    return
  }
  
  // 确认踢人操作
  emit('kickUser', userId)
}

const sendMessage = () => {
  const messageText = currentMessage.value.trim()
  if (messageText && props.webrtcConnected) {
    // 通过emit发送消息到父组件
    emit('sendMessage', messageText)

    // 立即清空输入框并隐藏
    currentMessage.value = ''
    hideChatInput()

    // 滚动到底部
    nextTick(() => {
      const chatContainer = document.querySelector('.lol-chat-messages')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    })

    console.log('📨 发送消息:', messageText)
  } else if (messageText && !props.webrtcConnected) {
    console.warn('⚠️ 无法发送消息：未连接到服务器')
    // 可以在这里显示一个提示
  }
}

const selectSlot = (index: number) => {
  emit('slotSelection', index)
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// LOL风格聊天输入框控制
const showChatInputBox = () => {
  showChatInput.value = true
  nextTick(() => {
    if (chatInputRef.value) {
      chatInputRef.value.focus()
    }
  })
}

const hideChatInput = () => {
  showChatInput.value = false
  currentMessage.value = ''
  // 移除焦点
  if (chatInputRef.value) {
    chatInputRef.value.blur()
  }
}

// 键盘事件处理
onMounted(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // 数字键1-9选择物品栏
    if (event.code >= 'Digit1' && event.code <= 'Digit9') {
      const slotIndex = parseInt(event.code.replace('Digit', '')) - 1
      if (slotIndex < inventoryItems.value.length) {
        emit('slotSelection', slotIndex)
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  // 清理事件监听器
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
const changeMicoStatus = ({peerId,status}:ChangeMicoStatus)=>{
  if(peerId !== webrtcStore.getYouPeer().id){
    webrtcStore.peers.find(peer=>peer.id === peerId)!.micOn = status
  }
}

// 音量更新处理
const handleVolumeUpdate = ({ peerId, volume }: { peerId: string, volume: number }) => {
  volumeLevels.value.set(peerId, volume)
  // 触发响应式更新
  volumeLevels.value = new Map(volumeLevels.value)
}

onMounted(()=>{
  eventBus.on('change-mico-status',changeMicoStatus)
  eventBus.on('volume-level-update', handleVolumeUpdate)
  
  // 初始化设置表单
  nextTick(()=>{
  if (webrtcStore.roomConfig) {
    settingsForm.value = {
      name: webrtcStore.roomConfig.name || '',
      description: webrtcStore.roomConfig.description || '',
      enableText: webrtcStore.roomConfig.enableText ?? true,
      enableVoice: webrtcStore.roomConfig.enableVoice ?? true,
      hostId: webrtcStore.roomConfig.hostId || webrtcStore.getYouPeer().id,
      maxUsers: webrtcStore.roomConfig.maxUsers,
      isPrivate: webrtcStore.roomConfig.isPrivate || false,
      password: webrtcStore.roomConfig.password || ''
    }
  }
  })
})

watch(()=>webrtcStore.roomConfig?.hostId,()=>{
  console.log('房间主ID更新');
  if(webrtcStore.roomConfig?.hostId)settingsForm.value.hostId = webrtcStore.roomConfig?.hostId 
})

onUnmounted(()=>{
  eventBus.off('change-mico-status',changeMicoStatus)
  eventBus.off('volume-level-update', handleVolumeUpdate)
})
</script>

<style scoped>
.game-ui {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 左上角按钮区域 */
.top-left-buttons {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 10px;
  pointer-events: auto;
}

.ui-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.ui-button:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.ui-button:disabled {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
  transform: none;
}

.ui-button:disabled:hover {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: none;
}

.copy-room-btn {
  background: rgba(0, 150, 255, 0.3);
  border-color: rgba(0, 150, 255, 0.6);
}

.copy-room-btn:hover:not(:disabled) {
  background: rgba(0, 150, 255, 0.6);
  border-color: rgba(0, 150, 255, 0.8);
}

.button-icon {
  font-size: 16px;
}

/* 功能开启状态徽章 */
.feature-badge {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.feature-badge.on {
  border-color: rgba(76, 175, 80, 0.7);
  background: rgba(76, 175, 80, 0.25);
}

.feature-badge.off {
  border-color: rgba(255, 107, 107, 0.7);
  background: rgba(255, 107, 107, 0.25);
}

/* 右上角在线用户列表 */
.online-users {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  max-height: 400px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  pointer-events: auto;
  overflow: hidden;
}

.users-header {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.users-title {
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  transition: background-color 0.3s ease;
}

.connection-indicator.connected .connection-dot {
  background: #51cf66;
}

.connection-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
}

.users-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: background 0.3s ease;
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-item.self {
  border: 1px solid rgba(0, 255, 0, 0.5);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  color: white;
  font-weight: bold;
  margin-bottom: 4px;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 麦克风按钮样式 */
.mic-button {
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-button:hover:not(.disabled) {
  transform: scale(1.2);
}

.mic-button.active {
  color: #4CAF50;
}

.mic-button.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 麦克风图标样式 */
.mic-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  transition: all 0.2s ease;
}

.mic-button.active .mic-icon {
  filter: brightness(1.2) saturate(1.3);
}

.mic-button.disabled .mic-icon {
  filter: grayscale(1) opacity(0.6);
}

/* 声音按钮样式 */
.sound-button {
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  margin-right: 8px;
}

.sound-button:hover {
  transform: scale(1.2);
}

.sound-button.active {
  color: #2196F3;
}

.sound-button.muted {
  color: #ff6b6b;
  opacity: 0.8;
}

.volume-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.volume-level {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A, #CDDC39);
  transition: width 0.3s ease;
}

/* 踢人按钮样式 */
.kick-button {
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  margin-left: 8px;
  padding: 4px;
  border-radius: 4px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.kick-button:hover {
  background: rgba(255, 107, 107, 0.3);
  border-color: rgba(255, 107, 107, 0.6);
  transform: scale(1.1);
  color: #ff4444;
}

/* 左下角聊天区域 */
/* LOL风格聊天区域 */
.lol-chat-area {
  position: absolute;
  bottom: 120px;
  left: 20px;
  width: 450px;
  height: 250px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* LOL风格消息列表 */
.lol-chat-messages {
  flex: 1;
  padding: 5px 0;
  overflow-y: auto;
  pointer-events: none;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lol-chat-messages::-webkit-scrollbar {
  display: none;
}

/* LOL风格消息项 */
.lol-chat-message {
  margin-bottom: 1px;
  padding: 1px 0;
  font-size: 12px;
  line-height: 1.2;
  word-wrap: break-word;
  background: transparent;
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
}

/* 自己的消息 - 绿色 */
.lol-chat-message.self .lol-message-author,
.lol-chat-message.self .lol-message-content {
  color: #00ff00;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 系统消息 - 黄色 */
.lol-chat-message.system .lol-message-content {
  color: #ffff00;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  font-weight: bold;
}

/* 其他玩家消息 - 白色 */
.lol-chat-message:not(.self):not(.system) .lol-message-author,
.lol-chat-message:not(.self):not(.system) .lol-message-content {
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* LOL风格消息元素 */
.lol-message-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  font-weight: normal;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  min-width: 32px;
  flex-shrink: 0;
}

.lol-message-author {
  font-weight: bold;
  font-size: 12px;
  flex-shrink: 0;
}

.lol-message-content {
  font-size: 12px;
  font-weight: normal;
  flex: 1;
}

/* LOL风格输入框区域 */
.lol-chat-input-area {
  padding: 4px 0;
  pointer-events: auto;
  margin-top: 4px;
  position: relative;
  z-index: 10;
}

.lol-chat-input {
  width: 100%;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  color: white;
  font-size: 12px;
  outline: none;
  transition: all 0.3s ease;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  font-family: inherit;
  height: 24px;
}

.lol-chat-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.lol-chat-input:focus {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.8);
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
}

/* 隐藏状态的输入框 */
.lol-chat-input.hidden {
  opacity: 0;
  pointer-events: none;
  background: transparent;
  border-color: transparent;
}

.lol-chat-input.hidden::placeholder {
  color: transparent;
}

/* 中间下方物品栏 */
.inventory-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
}

.inventory-slots {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.4);
  padding: 8px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
}

.inventory-slot {
  position: relative;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inventory-slot:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

.inventory-slot.selected {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
}

.inventory-slot.has-item {
  background: rgba(255, 255, 255, 0.08);
}

.item-icon {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-emoji {
  font-size: 32px;
  display: block;
  text-align: center;
  line-height: 1;
}

.item-count {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 4px;
  min-width: 16px;
  text-align: center;
}

.slot-number {
  position: absolute;
  top: 2px;
  left: 4px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  font-weight: bold;
}



/* 设置面板样式 */
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  pointer-events: auto;
}

.settings-panel {
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  padding: 0;
  width: 400px;
  max-width: 90vw;
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.settings-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-header h3 {
  color: white;
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.settings-content {
  padding: 20px;
}

.setting-item {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-item label {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.setting-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #4CAF50;
  cursor: pointer;
}

.setting-item input[type="text"],
.setting-item input[type="password"],
.setting-item select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  padding: 8px 12px;
  font-size: 14px;
  width: 150px;
}

/* 密码输入框包装器 */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 150px;
}

.password-input {
  flex: 1;
  padding-right: 35px;
  width: 100%;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.password-toggle-btn:hover {
  color: #00ffff;
  background: rgba(0, 255, 255, 0.1);
}

.setting-item input[type="text"]::placeholder,
.setting-item input[type="password"]::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.setting-item select option {
  background: #333;
  color: white;
}

.settings-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.save-btn {
  background: #4CAF50;
  color: white;
}

.save-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .online-users {
    width: 240px;
    right: 10px;
    top: 10px;
  }

  .chat-area {
    width: 300px;
    height: 250px;
    left: 10px;
    bottom: 100px;
  }

  .top-left-buttons {
    left: 10px;
    top: 10px;
  }

  .inventory-slot {
    width: 50px;
    height: 50px;
  }

  .item-icon {
    width: 32px;
    height: 32px;
  }
  
  .settings-panel {
    width: 90vw;
    margin: 20px;
  }
}
</style>
