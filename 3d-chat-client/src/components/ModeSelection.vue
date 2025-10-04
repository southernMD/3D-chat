<template>
  <div class="mode-selection-overlay" @click.stop>
    <div class="mode-container">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Emits
const emit = defineEmits<{
  modeSelected: [mode: 'create' | 'join']
}>()

// 选择模式
const selectMode = (mode: 'create' | 'join' | 'lobby') => {
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
  } else {
    // 加入房间逻辑保持不变
    emit('modeSelected', mode)
  }
}
</script>

<style scoped lang="less">
.mode-selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.mode-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90vw;
  max-width: 1200px;
  padding: 40px;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  width: 100%;
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
  
  .mode-option.create:hover & {
    color: #00ff00;
    transform: scale(1.1) rotate(360deg);
  }
  
  .mode-option.join:hover & {
    color: #ff6600;
    transform: scale(1.1) rotate(-360deg);
  }
  
  .mode-option.lobby:hover & {
    color: #ff00ff;
    transform: scale(1.1) rotate(360deg);
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

/* 响应式设计 */
@media (max-width: 768px) {
  .mode-options {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .mode-container {
    width: 95vw;
    padding: 20px;
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
}

@media (max-width: 1024px) and (min-width: 769px) {
  .mode-options {
    gap: 30px;
  }
  
  .mode-option {
    padding: 35px 25px;
  }
}
</style>
