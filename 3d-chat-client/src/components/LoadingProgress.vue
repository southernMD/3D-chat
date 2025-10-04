<template>
  <div class="loading-overlay" v-if="visible">
    <div class="loading-container">
      <!-- 初始信息阶段 -->
      <div v-if="showInitialMessage" class="initial-message-stage">
        <div class="loading-title">
          <h2>欢迎来到 3D 世界</h2>
          <div class="loading-subtitle">正在为您准备沉浸式体验...</div>
        </div>

        <div class="welcome-animation">
          <div class="pulse-circle"></div>
          <div class="welcome-icon">🌟</div>
        </div>

        <div class="initial-message">
          <p>即将开始加载 3D 场景和各项组件</p>
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <!-- 进度条阶段 - 只显示进度条和当前信息 -->
      <div v-else class="progress-stage">
        <!-- 主标题 -->
        <div class="loading-title">
          <h2>正在加载 3D 场景</h2>
          <div class="loading-subtitle">{{ currentMessage || '请稍候，正在初始化各项组件...' }}</div>
        </div>

        <!-- 进度条 -->
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
          <div class="progress-text">{{ progressPercentage }}%</div>
        </div>

        <!-- 当前加载信息 -->
        <div class="current-loading" v-if="currentMessage">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="loading-message">{{ currentMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// 步骤状态类型
type StepStatus = 'pending' | 'loading' | 'completed' | 'error'

// 步骤接口
interface LoadingStep {
  title: string
  description: string
  status: StepStatus
}

// Props
interface Props {
  visible: boolean
  steps: LoadingStep[]
  currentMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  currentMessage: ''
})

// 控制显示阶段
const showInitialMessage = ref(true)

// 监听加载开始，切换到进度条阶段
watch(() => props.steps, (newSteps) => {
  // 当有任何步骤开始加载时，切换到进度条阶段
  const hasLoadingStep = newSteps.some(step => step.status === 'loading')
  if (hasLoadingStep && showInitialMessage.value) {
    // 延迟切换，让用户看到初始信息
    setTimeout(() => {
      showInitialMessage.value = false
    }, 2000) // 显示初始信息2秒
  }
}, { deep: true, immediate: true })

// 当组件变为可见时，重置状态
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    showInitialMessage.value = true
  }
})

// 计算进度百分比
const progressPercentage = computed(() => {
  const totalSteps = props.steps.length
  if (totalSteps === 0) return 0

  const completedSteps = props.steps.filter(step => step.status === 'completed').length
  return Math.round((completedSteps / totalSteps) * 100)
})
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.loading-container {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition: all 0.5s ease;
}

/* 初始信息阶段样式 */
.initial-message-stage {
  text-align: center;
  animation: fadeIn 0.8s ease-in-out;
}

.welcome-animation {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 40px 0;
  height: 120px;
}

.pulse-circle {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 2px solid rgba(79, 172, 254, 0.3);
  border-radius: 50%;
  animation: pulse 2s infinite ease-in-out;
}

.welcome-icon {
  font-size: 48px;
  z-index: 1;
  animation: float 3s ease-in-out infinite;
}

.initial-message {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  margin-top: 20px;
}

.initial-message p {
  margin: 0 0 20px 0;
  font-weight: 500;
}

/* 进度条阶段样式 */
.progress-stage {
  animation: slideIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.loading-title {
  text-align: center;
  margin-bottom: 30px;
}

.loading-title h2 {
  color: white;
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.loading-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  font-weight: 400;
}

.progress-container {
  margin-bottom: 30px;
  position: relative;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 4px;
  transition: width 0.5s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  text-align: center;
  color: white;
  font-size: 14px;
  font-weight: 600;
}



.current-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.loading-dots {
  display: flex;
  margin-right: 12px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: #4facfe;
  border-radius: 50%;
  margin: 0 2px;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.loading-message {
  font-size: 14px;
  font-weight: 500;
}
</style>
