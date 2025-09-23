<template>
  <div class="game-ui">
    <!-- 左上角按钮区域 -->
    <div class="top-left-buttons">
      <button class="ui-button exit-btn" @click.stop="handleExit">
        <span class="button-icon">🚪</span>
        退出
      </button>
      <button class="ui-button settings-btn" @click.stop="handleSettings">
        <span class="button-icon">⚙️</span>
        设置
      </button>
      <button class="ui-button help-btn" @click.stop="handleHelp">
        <span class="button-icon">❓</span>
        帮助
      </button>
    </div>

    <!-- 右上角在线用户列表 -->
    <div class="online-users">
      <div class="users-header">
        <span class="users-title">在线用户 ({{ onlineUsers.length }})</span>
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
            <span class="user-name">{{ user.name }}</span>
            <div class="user-status">
              <span
                class="mic-status"
                :class="{ 'active': user.micOn, 'muted': !user.micOn }"
                @click.stop="toggleMic(user.id)"
              >
                {{ user.micOn ? '🎤' : '🔇' }}
              </span>
              <div class="volume-bar">
                <div 
                  class="volume-level" 
                  :style="{ width: user.volume + '%' }"
                ></div>
              </div>
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
          placeholder="按回车发送消息..."
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
            <span v-if="item.count > 1" class="item-count">{{ item.count }}</span>
          </div>
          <div class="slot-number">{{ index + 1 }}</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// 接口定义
interface User {
  id: string
  name: string
  micOn: boolean
  volume: number
  isSelf: boolean
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

// 响应式数据
const onlineUsers = ref<User[]>([
  { id: '1', name: '玩家1', micOn: true, volume: 75, isSelf: true },
  { id: '2', name: '玩家2', micOn: false, volume: 0, isSelf: false },
  { id: '3', name: '玩家3', micOn: true, volume: 60, isSelf: false },
])

const chatMessagesRef = ref()
const chatInputRef = ref()
const showChatInput = ref(false) // 默认隐藏输入框
const chatMessages = ref<ChatMessage[]>([
  { id: '1', author: '系统', content: '欢迎进入游戏世界！', timestamp: Date.now() - 120000, isSelf: false, isSystem: true },
  { id: '2', author: '玩家2', content: '大家好！有人在吗？', timestamp: Date.now() - 90000, isSelf: false, isSystem: false },
  { id: '3', author: '我', content: '我在这里！', timestamp: Date.now() - 60000, isSelf: true, isSystem: false },
  { id: '4', author: '玩家3', content: '这个游戏真不错！', timestamp: Date.now() - 30000, isSelf: false, isSystem: false },
])

const currentMessage = ref('')

// 全局键盘监听
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // 按回车键显示聊天输入框（只有在输入框未显示时）
  if (event.key === 'Enter' && !showChatInput.value) {
    event.preventDefault()
    showChatInputBox()
  }
}

onMounted(() => {
  console.log('💬 聊天消息初始化:', chatMessages.value)
  console.log('📝 聊天消息数量:', chatMessages.value.length)

  // 添加全局键盘监听
  document.addEventListener('keydown', handleGlobalKeydown)

  // 测试添加一条消息
  setTimeout(() => {
    const testMessage: ChatMessage = {
      id: 'test_' + Date.now(),
      author: '测试',
      content: '这是一条测试消息，用来验证聊天功能是否正常工作。',
      timestamp: Date.now(),
      isSelf: false,
      isSystem: false
    }
    chatMessages.value.push(testMessage)
    console.log('🧪 添加测试消息:', testMessage)
  }, 2000)
})

onUnmounted(() => {
  // 清理全局键盘监听
  document.removeEventListener('keydown', handleGlobalKeydown)
})
const selectedSlot = ref(0)

// 初始化物品栏（9个槽位，类似MC）
const inventoryItems = ref<InventoryItem[]>(Array.from({ length: 9 }, (_, index) => {
  const itemData = [
    { name: '钻石剑', icon: '⚔️', description: '锋利的钻石剑，攻击力很高' },
    { name: '生命药水', icon: '🧪', description: '恢复生命值的神奇药水' },
    { name: '面包', icon: '🍞', description: '美味的面包，可以恢复饥饿值' }
  ]

  return {
    id: index < 3 ? `item_${index}` : null,
    name: index < 3 ? itemData[index].name : '',
    icon: index < 3 ? itemData[index].icon : '',
    count: index < 3 ? Math.floor(Math.random() * 64) + 1 : 0,
    description: index < 3 ? itemData[index].description : ''
  }
}))



// 方法
const handleExit = () => {
  if (confirm('确定要退出游戏吗？')) {
    console.log('退出游戏')
  }
}

const handleSettings = () => {
  console.log('打开设置')
}

const handleHelp = () => {
  console.log('打开帮助')
}

const toggleMic = (userId: string) => {
  const user = onlineUsers.value.find(u => u.id === userId)
  if (user && user.isSelf) {
    user.micOn = !user.micOn
    user.volume = user.micOn ? 75 : 0
  }
}

const sendMessage = () => {
  const messageText = currentMessage.value.trim()
  if (messageText) {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      author: '我',
      content: messageText,
      timestamp: Date.now(),
      isSelf: true,
      isSystem: false
    }
    chatMessages.value.push(newMessage)

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

    // 模拟其他玩家回复（可选，用于测试）
    if (Math.random() > 0.7) {
      setTimeout(() => {
        const responses = [
          '收到！',
          '好的',
          '了解',
          '👍',
          '没问题',
          '哈哈哈'
        ]
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          author: '玩家2',
          content: randomResponse,
          timestamp: Date.now(),
          isSelf: false,
          isSystem: false
        }
        chatMessages.value.push(botMessage)

        // 再次滚动到底部
        nextTick(() => {
          const chatContainer = document.querySelector('.lol-chat-messages')
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight
          }
        })
      }, 1000 + Math.random() * 2000) // 1-3秒后回复
    }
  }
}

const selectSlot = (index: number) => {
  selectedSlot.value = index
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
        selectedSlot.value = slotIndex
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  // 清理事件监听器
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
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

.button-icon {
  font-size: 16px;
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
}

.users-title {
  color: white;
  font-weight: bold;
  font-size: 16px;
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

.mic-status {
  cursor: pointer;
  font-size: 16px;
  transition: transform 0.2s ease;
}

.mic-status:hover {
  transform: scale(1.2);
}

.mic-status.muted {
  opacity: 0.5;
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
}
</style>
