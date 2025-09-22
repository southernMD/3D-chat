<template>
  <div class="mode-selection-page">
    <div class="mode-container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">{{ $t('mode.pageTitle') }}</h1>
        <p class="page-subtitle">{{ $t('mode.pageSubtitle') }}</p>
      </div>

      <!-- 模式选项 -->
      <div class="mode-options">
        <!-- 创建房间 -->
        <div class="mode-option" @click="selectMode('create')">
          <div class="option-icon create">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>
          <h3>{{ $t('mode.create.title') }}</h3>
          <p>{{ $t('mode.create.description') }}</p>
        </div>

        <!-- 加入房间 -->
        <div class="mode-option" @click="selectMode('join')">
          <div class="option-icon join">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <h3>{{ $t('mode.join.title') }}</h3>
          <p>{{ $t('mode.join.description') }}</p>
        </div>

        <!-- 房间大厅 -->
        <div class="mode-option" @click="selectMode('lobby')">
          <div class="option-icon lobby">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 8h4V4H4v4zM10 20h4v-4h-4v4zM4 20h4v-4H4v4zM4 14h4v-4H4v4zM10 14h4v-4h-4v4zM16 4v4h4V4h-4zM10 8h4V4h-4v4zM16 14h4v-4h-4v4zM16 20h4v-4h-4v4z"/>
            </svg>
          </div>
          <h3>{{ $t('mode.lobby.title') }}</h3>
          <p>{{ $t('mode.lobby.description') }}</p>
        </div>
      </div>

      <!-- 返回按钮 -->
      <div class="back-section">
        <button class="back-button" @click="goBack">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
          </svg>
          {{ $t('common.back') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
// import { showError, showSuccess } from '@/utils/message'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

// 选择模式
const selectMode = async (mode: 'create' | 'join' | 'lobby') => {
  if (mode === 'create') {
    // 检查是否已登录
    if (!authStore.isAuthenticated) {
      // 未登录，跳转到登录页面
      router.push('/login')
      return
    }
    // 已登录，跳转到房间创建页面
    router.push('/create-room')
  } else if (mode === 'lobby') {
    // 跳转到房间大厅
    router.push('/lobby')
  } else if (mode === 'join') {
    // 检查是否已登录
    if (!authStore.isAuthenticated) {
      // 未登录，跳转到登录页面
      router.push('/login')
      return
    }

    // 弹出输入框让用户输入房间ping码
    try {
      const { value: pingCode } = await ElMessageBox.prompt(
        '请输入房间ping码（房间UUID）',
        '加入房间',
        {
          confirmButtonText: '加入',
          cancelButtonText: '取消',
          inputPattern: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
          inputErrorMessage: '请输入有效的房间UUID格式',
          inputPlaceholder: '例如: 123e4567-e89b-12d3-a456-426614174000'
        }
      )

      if (pingCode && pingCode.trim()) {
        const roomId = pingCode.trim()

        // 先检查房间是否存在 (使用HTTP接口，无需WebRTC连接)
        try {
          // 构建HTTP URL
          const host = import.meta.env.VITE_APP_HOST || 'localhost'
          const port = import.meta.env.VITE_APP_HOST_PORT || '3000'
          const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
          const serverUrl = `${protocol}://${host}:${port}`

          const response = await fetch(`${serverUrl}/api/rooms/${roomId}/exists`)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()

          if (data.status === 'success' && data.data.exists) {
            // 跳转到模型选择页面，并传递ping码
            router.push({
              path: '/model-selection',
              query: {
                pingCode: roomId
              }
            })
          } else {
            ElMessage.error('房间不存在或已被删除，请检查房间码是否正确')
          }
        } catch (error) {
          console.error('检查房间失败:', error)
          ElMessage.error('检查房间失败，请重试')
        }
      }
    } catch (error) {
      // 用户取消了输入
      console.log('用户取消了加入房间')
    }
  }
}

// 返回首页
const goBack = () => {
  router.push('/')
}

// 页面进入动画
onMounted(() => {
  // 初始设置
  gsap.set('.page-header', { opacity: 0, y: -50 })
  gsap.set('.mode-option', { opacity: 0, y: 50, scale: 0.8 })
  gsap.set('.back-section', { opacity: 0, y: 30 })

  // 创建时间线
  const tl = gsap.timeline()

  // 页面标题动画
  tl.to('.page-header', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: "power2.out"
  })

  // 模式选项动画
  tl.to('.mode-option', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
    ease: "back.out(1.7)",
    stagger: 0.2
  }, "-=0.4")

  // 返回按钮动画
  tl.to('.back-section', {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: "power2.out"
  }, "-=0.3")
})

// 清理动画
onUnmounted(() => {
  gsap.killTweensOf("*")
})
</script>

<style scoped lang="less">
.mode-selection-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 60px; /* 为TopBar留出空间 */
  overflow-y: auto;
}

.mode-container {
  width: 90vw;
  max-width: 1200px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 50px;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 3.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
  text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
}

.page-subtitle {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  width: 100%;
  max-width: 900px;
}

.mode-option {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
  }
  
  &.create:hover {
    border-color: #00ff00;
    box-shadow: 0 20px 40px rgba(0, 255, 0, 0.3);
  }
  
  &.join:hover {
    border-color: #ff6600;
    box-shadow: 0 20px 40px rgba(255, 102, 0, 0.3);
  }
  
  &.lobby:hover {
    border-color: #ff00ff;
    box-shadow: 0 20px 40px rgba(255, 0, 255, 0.3);
  }
}

.option-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 30px;
  color: #00ffff;
  transition: all 0.3s ease;
  
  svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 15px currentColor);
  }
  
  .mode-option:hover & {
    transform: scale(1.1) rotate(360deg);
  }
  
  .mode-option.create:hover & {
    color: #00ff00;
  }
  
  .mode-option.join:hover & {
    color: #ff6600;
    transform: scale(1.1) rotate(-360deg);
  }
  
  .mode-option.lobby:hover & {
    color: #ff00ff;
  }
}

.mode-option h3 {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 15px;
  transition: all 0.3s ease;
}

.mode-option:hover h3 {
  color: #00ffff;
  text-shadow: 0 0 20px currentColor;
  transform: scale(1.05);
}

.mode-option p {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0;
}

.back-section {
  margin-top: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 2px solid rgba(0, 255, 255, 0.3);
  color: #00ffff;
  padding: 15px 30px;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.1rem;
  
  svg {
    width: 20px;
    height: 20px;
  }
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
    transform: translateX(-5px);
    box-shadow: 0 10px 25px rgba(0, 255, 255, 0.3);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mode-options {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .mode-container {
    width: 95vw;
    padding: 20px;
    gap: 30px;
  }
  
  .mode-option {
    padding: 30px 20px;
  }
  
  .option-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 20px;
  }
  
  .mode-option h3 {
    font-size: 1.5rem;
  }
  
  .mode-option p {
    font-size: 1rem;
  }
  
  .page-title {
    font-size: 2.5rem;
  }
  
  .page-subtitle {
    font-size: 1.1rem;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .mode-options {
    gap: 30px;
  }
  
  .mode-option {
    padding: 35px 25px;
  }
  
  .page-title {
    font-size: 3rem;
  }
}
</style>