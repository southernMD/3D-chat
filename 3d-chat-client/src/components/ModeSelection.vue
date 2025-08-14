<template>
  <div class="mode-selection-overlay" v-if="visible" @click.stop>
    <div ref="modeContainer" class="mode-container" @click.stop>
      <!-- 创建房间面板 -->
      <div
        ref="createPanel"
        class="mode-panel create-panel"
        :class="{ 'expanded': hoveredMode === 'create' }"
        @mouseenter="handleModeHover('create')"
        @mouseleave="handleModeLeave"
      >
        <div class="panel-content" @click.stop>
          <!-- 左侧：标题和描述 -->
          <div class="panel-left">
            <div ref="createIcon" class="panel-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
            </div>
            <h3 ref="createTitle" class="panel-title">{{ $t('mode.create.title') }}</h3>
            <p ref="createDescription" class="panel-description">{{ $t('mode.create.description') }}</p>
          </div>

          <!-- 右侧：详细内容和按钮 -->
          <div ref="createDetails" class="panel-right panel-details">
            <!-- <div class="feature-list">
              <div ref="createFeature1" class="feature-item">
                <div class="feature-icon">🎮</div>
                <span>{{ $t('mode.create.feature1') }}</span>
              </div>
              <div ref="createFeature2" class="feature-item">
                <div class="feature-icon">👥</div>
                <span>{{ $t('mode.create.feature2') }}</span>
              </div>
              <div ref="createFeature3" class="feature-item">
                <div class="feature-icon">🔧</div>
                <span>{{ $t('mode.create.feature3') }}</span>
              </div>
            </div> -->
            <button ref="createButton" class="mode-action-btn" @click="selectMode('create')">{{ $t('mode.create.action') }}</button>
          </div>
        </div>
      </div>

      <!-- 分割线 -->
      <div ref="dividerLine" class="divider-line"></div>

      <!-- 加入房间面板 -->
      <div
        ref="joinPanel"
        class="mode-panel join-panel"
        :class="{ 'expanded': hoveredMode === 'join' }"
        @mouseenter="handleModeHover('join')"
        @mouseleave="handleModeLeave"
      >
        <div class="panel-content" @click.stop>
          <!-- 左侧：标题和描述 -->
          <div class="panel-left">
            <div ref="joinIcon" class="panel-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <h3 ref="joinTitle" class="panel-title">{{ $t('mode.join.title') }}</h3>
            <p ref="joinDescription" class="panel-description">{{ $t('mode.join.description') }}</p>
          </div>

          <!-- 右侧：输入框和按钮 -->
          <div ref="joinDetails" class="panel-right panel-details">
            <div ref="joinInputSection" class="ping-input-section">
              <label ref="joinInputLabel" class="input-label">{{ $t('mode.join.pingLabel') }}</label>
              <input
                ref="joinInput"
                type="text"
                class="ping-input"
                :placeholder="$t('mode.join.pingPlaceholder')"
              />
            </div>
            <div class="login-notice">
              <span class="notice-text">未登录用户会自动创建账号并登录</span>
            </div>
            <button ref="joinButton" class="mode-action-btn" @click="selectMode('join')">{{ $t('mode.join.action') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

// Props
const props = defineProps<{
  visible: boolean
}>()

// Emits
const emit = defineEmits<{
  modeSelected: [mode: 'create' | 'join']
}>()

// DOM refs
const modeContainer = ref<HTMLElement>()
const createPanel = ref<HTMLElement>()
const joinPanel = ref<HTMLElement>()
const dividerLine = ref<HTMLElement>()
const createDetails = ref<HTMLElement>()
const joinDetails = ref<HTMLElement>()
const createIcon = ref<HTMLElement>()
const joinIcon = ref<HTMLElement>()
const createTitle = ref<HTMLElement>()
const joinTitle = ref<HTMLElement>()
const createDescription = ref<HTMLElement>()
const joinDescription = ref<HTMLElement>()

// 新增的详细元素 refs
const createFeature1 = ref<HTMLElement>()
const createFeature2 = ref<HTMLElement>()
const createFeature3 = ref<HTMLElement>()
const createButton = ref<HTMLElement>()
const joinInputSection = ref<HTMLElement>()
const joinInputLabel = ref<HTMLElement>()
const joinInput = ref<HTMLElement>()
const joinButton = ref<HTMLElement>()

// 状态
const hoveredMode = ref<'create' | 'join' | null>(null)
const isFullyVisible = ref(false)
const isHoverLocked = ref(false) // 悬停锁定状态

// 监听 visible 变化，执行进入动画
watch(() => props.visible, (newVal) => {
  if (newVal) {
    console.log('ModeSelection visible, starting enter animation')
    // 重置状态
    isFullyVisible.value = false
    hoveredMode.value = null

    nextTick(() => {
      // 确保所有元素都已渲染后再执行动画
      setTimeout(() => {
        console.log('Executing playEnterAnimation')
        playEnterAnimation()
      }, 100)
    })
  } else {
    // 重置状态
    isFullyVisible.value = false
    hoveredMode.value = null
    isHoverLocked.value = false
  }
})

// 进入动画
const playEnterAnimation = () => {
  console.log('=== Starting playEnterAnimation ===')

  // 检查所有必需的元素
  const elements = {
    modeContainer: modeContainer.value,
    createPanel: createPanel.value,
    joinPanel: joinPanel.value,
    dividerLine: dividerLine.value,
    createIcon: createIcon.value,
    joinIcon: joinIcon.value,
    createTitle: createTitle.value,
    joinTitle: joinTitle.value,
    createDescription: createDescription.value,
    joinDescription: joinDescription.value
  }

  // 打印元素状态
  Object.entries(elements).forEach(([name, element]) => {
    console.log(`${name}:`, element ? 'Found' : 'NOT FOUND')
  })

  if (!elements.modeContainer) {
    console.error('modeContainer not found, aborting animation')
    return
  }

  // 停止所有可能的动画
  Object.values(elements).forEach(element => {
    if (element) gsap.killTweensOf(element)
  })

  // 设置所有元素的初始状态
  console.log('Setting initial states...')

  // 容器初始状态
  gsap.set(elements.modeContainer, {
    opacity: 0,
    scale: 0.8,
    y: 50
  })

  // 面板初始状态
  if (elements.createPanel && elements.joinPanel) {
    gsap.set([elements.createPanel, elements.joinPanel], {
      opacity: 0,
      x: -50,
      scale: 0.9
    })
  }

  // 分割线初始状态 - 完全隐藏
  if (elements.dividerLine) {
    gsap.set(elements.dividerLine, {
      scaleY: 0,
      opacity: 0,
      visibility: 'hidden'
    })
  }

  // 图标初始状态
  if (elements.createIcon && elements.joinIcon) {
    gsap.set([elements.createIcon, elements.joinIcon], {
      opacity: 0,
      scale: 0.5,
      rotation: -180
    })
  }

  // 标题初始状态
  if (elements.createTitle && elements.joinTitle) {
    gsap.set([elements.createTitle, elements.joinTitle], {
      opacity: 0,
      y: 30
    })
  }

  // 描述初始状态
  if (elements.createDescription && elements.joinDescription) {
    gsap.set([elements.createDescription, elements.joinDescription], {
      opacity: 0,
      y: 20
    })
  }

  // 设置所有详细元素初始隐藏
  const allDetailElements = [
    createFeature1.value, createFeature2.value, createFeature3.value, createButton.value,
    joinInputSection.value, joinInput.value, joinButton.value
  ].filter(Boolean)

  gsap.set(allDetailElements, {
    opacity: 0,
    visibility: 'hidden',
    x: 0,
    scale: 1
  })

  console.log('Creating animation timeline...')

  // 创建动画时间线
  const tl = gsap.timeline({
    onComplete: () => {
      console.log('=== Enter animation COMPLETE ===')
      isFullyVisible.value = true
      isHoverLocked.value = false // 确保进入动画完成后解锁
    }
  })

  // 1. 容器淡入
  tl.to(elements.modeContainer, {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 0.8,
    ease: "power2.out"
  })

  // 2. 面板出现
  if (elements.createPanel && elements.joinPanel) {
    tl.to([elements.createPanel, elements.joinPanel], {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.2
    }, "-=0.4")
  }

  // 3. 图标动画
  if (elements.createIcon && elements.joinIcon) {
    tl.to([elements.createIcon, elements.joinIcon], {
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
      stagger: 0.1
    }, "-=0.4")
  }

  // 4. 标题动画
  if (elements.createTitle && elements.joinTitle) {
    tl.to([elements.createTitle, elements.joinTitle], {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.1
    }, "-=0.5")
  }

  // 5. 描述动画
  if (elements.createDescription && elements.joinDescription) {
    tl.to([elements.createDescription, elements.joinDescription], {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.1
    }, "-=0.4")
  }

  // 6. 分割线出现
  if (elements.dividerLine) {
    tl.set(elements.dividerLine, { visibility: 'visible' }, "-=0.3")
    tl.to(elements.dividerLine, {
      scaleY: 1,
      opacity: 1,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.3")
  }

  console.log('Animation timeline created and started')
}

// 模式悬停处理
const handleModeHover = (mode: 'create' | 'join') => {
  if (!isFullyVisible.value) {
    console.log('Not fully visible yet, ignoring hover. isFullyVisible:', isFullyVisible.value)
    return
  }

  if (isHoverLocked.value) {
    console.log('Hover is locked, ignoring hover event for:', mode)
    return
  }

  console.log('Hovering mode:', mode)
  isHoverLocked.value = true // 锁定悬停
  hoveredMode.value = mode
  playHoverAnimation(mode)
}

const handleModeLeave = () => {
  if (!isFullyVisible.value) {
    console.log('Not fully visible yet, ignoring leave. isFullyVisible:', isFullyVisible.value)
    return
  }

  if (!isHoverLocked.value) {
    console.log('No hover to leave, ignoring leave event')
    return
  }

  console.log('Leaving hover - immediate cleanup and unlock')

  // 停止所有可能的动画，包括时间线
  const allDetailElements = [
    createFeature1.value, createFeature2.value, createFeature3.value, createButton.value,
    joinInputSection.value, joinInput.value, joinButton.value
  ].filter(Boolean)

  // 停止所有GSAP动画和时间线
  gsap.killTweensOf("*") // 停止所有动画
  gsap.globalTimeline.clear() // 清除全局时间线

  gsap.killTweensOf([
    createPanel.value, joinPanel.value, dividerLine.value,
    createDetails.value, joinDetails.value,
    ...allDetailElements
  ])

  // 立即隐藏所有详细元素
  gsap.set(allDetailElements, {
    opacity: 0,
    visibility: 'hidden',
    x: 0,
    scale: 1
  })

  // 立即隐藏所有右侧面板容器
  gsap.set([createDetails.value, joinDetails.value], {
    opacity: 0,
    visibility: 'hidden',
    display: 'none'
  })

  hoveredMode.value = null
  isHoverLocked.value = false // 解锁悬停
  playLeaveAnimation()
}

// 悬停动画
const playHoverAnimation = (mode: 'create' | 'join') => {
  const activePanel = mode === 'create' ? createPanel.value : joinPanel.value
  const inactivePanel = mode === 'create' ? joinPanel.value : createPanel.value

  if (!activePanel || !inactivePanel || !dividerLine.value) {
    console.log('Missing elements for hover animation')
    return
  }

  console.log('Playing hover animation for:', mode)

  // 获取当前模式和另一个模式的详细元素
  const currentDetailElements = mode === 'create'
    ? [createFeature1.value, createFeature2.value, createFeature3.value, createButton.value]
    : [joinInputSection.value, joinInput.value, joinButton.value]

  const otherDetailElements = mode === 'create'
    ? [joinInputSection.value, joinInput.value, joinButton.value]
    : [createFeature1.value, createFeature2.value, createFeature3.value, createButton.value]

  // 获取所有详细元素
  const allDetailElements = [...currentDetailElements, ...otherDetailElements].filter(Boolean)

  // 停止所有正在进行的动画
  gsap.killTweensOf([activePanel, inactivePanel, dividerLine.value, createDetails.value, joinDetails.value, ...allDetailElements])

  // 立即隐藏所有详细元素和面板容器，防止残留
  gsap.set(allDetailElements, {
    opacity: 0,
    visibility: 'hidden',
    x: 0,
    scale: 1
  })

  // 立即隐藏所有右侧面板容器
  gsap.set([createDetails.value, joinDetails.value], {
    opacity: 0,
    visibility: 'hidden',
    display: 'none'
  })

  // 设置当前模式的详细元素初始位置
  currentDetailElements.forEach(element => {
    if (element) {
      gsap.set(element, {
        opacity: 0,
        visibility: 'hidden',
        x: mode === 'create' ? 100 : -100,
        scale: 0.8
      })
    }
  })

  const tl = gsap.timeline()

  // 阶段1：隐藏分割线和非活跃面板
  tl.to(dividerLine.value, {
    opacity: 0,
    scaleY: 0,
    duration: 0.3,
    ease: "power2.out"
  })

  tl.to(inactivePanel, {
    opacity: 0,
    scale: 0.7,
    x: mode === 'create' ? 300 : -300,
    duration: 0.5,
    ease: "power2.inOut",
    onComplete: () => {
      gsap.set(inactivePanel, { display: 'none' })
    }
  }, "-=0.2")

  // 阶段2：活跃面板展开
  tl.to(activePanel, {
    width: '100%',
    duration: 0.6,
    ease: "power2.inOut"
  }, "-=0.3")

  // 阶段3：标题面板动画完成后，显示按钮面板
  tl.call(() => {
    console.log('Title animation complete, showing detail elements for:', mode)

    // 先显示右侧面板容器
    const rightPanel = mode === 'create' ? createDetails.value : joinDetails.value
    if (rightPanel) {
      gsap.set(rightPanel, {
        display: 'flex',
        visibility: 'visible',
        opacity: 1
      })
    }

    currentDetailElements.forEach((element, index) => {
      if (element) {
        // 立即显示并设置初始动画状态
        gsap.set(element, {
          opacity: 0,
          visibility: 'visible',
          x: mode === 'create' ? 50 : -50,
          scale: 0.9
        })

        // 然后执行显示动画
        gsap.to(element, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.5,
          ease: "power2.out",
          delay: index * 0.1
        })
      }
    })
  })
}

// 离开动画 - 立即隐藏按钮面板，然后平滑恢复
const playLeaveAnimation = () => {
  if (!createPanel.value || !joinPanel.value || !dividerLine.value) {
    console.log('Missing elements for leave animation')
    return
  }

  console.log('Playing leave animation with smooth restore')

  // 收集所有需要重置的元素
  const allDetailElements = [
    createFeature1.value, createFeature2.value, createFeature3.value, createButton.value,
    joinInputSection.value, joinInput.value, joinButton.value
  ].filter(Boolean)

  // 停止所有正在进行的动画
  gsap.killTweensOf([
    createPanel.value, joinPanel.value, dividerLine.value,
    createDetails.value, joinDetails.value,
    ...allDetailElements
  ])

  // 立即隐藏所有详细元素和右侧面板
  gsap.set(allDetailElements, {
    opacity: 0,
    visibility: 'hidden',
    x: 0,
    scale: 1
  })

  // 立即隐藏右侧面板容器
  gsap.set([createDetails.value, joinDetails.value], {
    opacity: 0,
    visibility: 'hidden',
    display: 'none'
  })

  // 创建恢复动画时间线
  const tl = gsap.timeline()

  // 1. 立即恢复面板显示和隐藏右侧面板
  tl.set([createPanel.value, joinPanel.value], {
    display: 'flex'
  })

  // 2. 面板收缩动画
  tl.to([createPanel.value, joinPanel.value], {
    width: 'auto',
    opacity: 1,
    scale: 1,
    x: 0,
    duration: 0.5,
    ease: "power2.out"
  })

  // 3. 分割线重新出现
  tl.set(dividerLine.value, { visibility: 'visible' }, "-=0.3")
  tl.to(dividerLine.value, {
    opacity: 1,
    scaleY: 1,
    duration: 0.4,
    ease: "power2.out"
  }, "-=0.3")
}

// 选择模式
const selectMode = (mode: 'create' | 'join') => {
  if (!isFullyVisible.value) return
  emit('modeSelected', mode)
}

// 组件挂载时检查是否需要执行动画
onMounted(() => {
  console.log('ModeSelection onMounted, visible:', props.visible)
  if (props.visible) {
    nextTick(() => {
      setTimeout(() => {
        console.log('Executing playEnterAnimation from onMounted')
        playEnterAnimation()
      }, 100)
    })
  }
})
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
  width: 80vw;
  height: 80vh;
  position: relative;
  overflow: hidden;
}

.mode-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  position: relative;
  opacity: 0; /* 初始隐藏，防止闪烁 */
}

.divider-line {
  position: absolute;
  top: 10%;
  bottom: 10%;
  left: 50%;
  width: 2px;
  background: linear-gradient(to bottom,
    transparent 0%,
    rgba(0, 255, 255, 0.8) 20%,
    rgba(255, 0, 255, 0.8) 50%,
    rgba(0, 255, 255, 0.8) 80%,
    transparent 100%
  );
  transform: translateX(-50%);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  transform-origin: center top;
}

.panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  transition: all 0.6s ease;
}

/* 创建面板展开时的布局 - 标题在左边 */
.create-panel.expanded .panel-content {
  position: relative;
  align-items: center;
  justify-content: flex-start;
  padding: 60px 80px;
}

.create-panel.expanded .panel-left {
  position: absolute;
  left: 80px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  z-index: 2;
}

.create-panel.expanded .panel-right {
  position: absolute;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 300px;
  z-index: 1;
}

/* 加入面板展开时的布局 - 标题在右边 */
.join-panel.expanded .panel-content {
  position: relative;
  align-items: center;
  justify-content: flex-end;
  padding: 60px 80px;
}

.join-panel.expanded .panel-left {
  position: absolute;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  z-index: 2;
}

.join-panel.expanded .panel-right {
  position: absolute;
  left: 80px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 300px;
  z-index: 1;
}

.panel-icon {
  width: 120px;
  height: 120px;
  margin-bottom: 30px;
  color: #00ffff;
  transition: all 0.5s ease;

  svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 20px currentColor);
  }

  .create-panel.expanded & {
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
    margin-right: 0;
    color: #ff00ff;
  }

  .join-panel.expanded & {
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
    margin-left: 0;
    color: #ff00ff;
  }
}

.panel-title {
  font-size: 3rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 20px;
  transition: all 0.5s ease;

  .expanded & {
    color: #00ffff;
    text-shadow: 0 0 30px currentColor;
    font-size: 4rem;
    margin-bottom: 15px;
  }
}

.panel-description {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 30px;
  line-height: 1.6;
  max-width: 400px;
}

.panel-details {
  width: 100%;
  max-width: 500px;
}

/* 右侧面板默认完全隐藏 */
.panel-right {
  opacity: 0;
  visibility: hidden;
  display: none;
}

/* 详细元素默认隐藏 */
.feature-item,
.mode-action-btn,
.ping-input-section {
  opacity: 0;
  visibility: hidden;
}

/* 展开时显示右侧面板 */
.mode-panel.expanded .panel-right {
  display: flex;
  visibility: visible;
}

.feature-list {
  margin-bottom: 40px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    transform: translateX(15px);
  }
}

.feature-icon {
  font-size: 2rem;
  width: 40px;
  text-align: center;
}

.ping-input-section {
  margin-bottom: 30px;
  text-align: left;
}

.input-label {
  display: block;
  color: #00ffff;
  font-weight: 600;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.ping-input {
  width: 100%;
  padding: 20px 25px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 15px;
  color: #ffffff;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  display: block;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.15);
  }
}

.mode-action-btn {
  width: 100%;
  padding: 20px 40px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  border: none;
  border-radius: 15px;
  color: #000000;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 255, 255, 0.5);
    background: linear-gradient(45deg, #ff00ff, #00ffff);
  }
  
  &:active {
    transform: translateY(-2px);
  }
}

.login-notice {
  margin-bottom: 20px;
  text-align: center;
}

.notice-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 400;
  line-height: 1.4;
}


</style>
