
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { gsap } from 'gsap'
import { TextPlugin } from 'gsap/TextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { useI18n } from 'vue-i18n'
import ParticleBackground from '@/components/ParticleBackground.vue'
import TopBar from '@/components/TopBar.vue'

// 注册GSAP插件
gsap.registerPlugin(TextPlugin, ScrollTrigger)

// i18n
const { t, locale } = useI18n()

// 响应式引用
const heroSection = ref<HTMLElement>()
const mainTitle = ref<HTMLElement>()
const subtitle = ref<HTMLElement>()
const enterButton = ref<HTMLElement>()
const backgroundElements = ref<HTMLElement[]>([])
const floatingElements = ref<HTMLElement[]>([])



onMounted(() => {
  // 初始化动画
  initHeroAnimations()
  initBackgroundAnimations()
  // initScrollAnimations() // 移除滚动动画
  initInteractiveElements()
  initButtonAnimations()
})

// 进入聊天功能
const enterChat = () => {
  // 创建退出动画
  const exitTl = gsap.timeline({
    onComplete: () => {
      // 这里可以路由到聊天页面
      console.log('Entering 3D Chat...')
    }
  })

  exitTl
    .to([mainTitle.value, subtitle.value, enterButton.value], {
      scale: 0.8,
      opacity: 0,
      y: -50,
      duration: 0.6,
      ease: "power2.in",
      stagger: 0.1
    })
    .to(heroSection.value, {
      scale: 1.2,
      opacity: 0,
      duration: 0.8,
      ease: "power2.in"
    }, "-=0.3")
}

// 主标题和副标题动画
const initHeroAnimations = () => {
  // 设置初始状态 - 使用整数像素值避免模糊
  gsap.set([mainTitle.value, subtitle.value], {
    opacity: 0,
    y: 100,
    scale: 0.8,
    force3D: true,
    transformOrigin: "center center"
  })

  // 设置单词初始状态 - 避免模糊
  const titleWords = mainTitle.value?.querySelectorAll('.title-word')
  if (titleWords) {
    gsap.set(titleWords, {
      opacity: 0,
      y: 50,
      rotationX: -90,
      transformOrigin: "50% 50% -50px",
      force3D: true,
      backfaceVisibility: "hidden"
    })
  }

  // 创建主时间线
  const masterTl = gsap.timeline({ delay: 0.5 })

  // 标题容器动画 - 使用整数像素值
  masterTl.to(mainTitle.value, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.8,
    ease: "power3.out",
    force3D: true,
    transformOrigin: "center center"
  })

  // 单词逐个出现动画
  const titleWordElements = mainTitle.value?.querySelectorAll('.title-word')
  if (titleWordElements) {
    masterTl.to(titleWordElements, {
      opacity: 1,
      y: 0,
      rotationX: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
      force3D: true,
      transformOrigin: "center center",
      stagger: {
        amount: locale.value === 'zh' ? 0 : 1.2, // 中文不需要stagger
        from: "start"
      },
      onComplete: () => {
        // 动画完成后启动循环颜色动画
        startLoopAnimations()
      }
    }, "-=0.4")
  }

  // 副标题动画 - 防止模糊
  masterTl.to(subtitle.value, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 1,
    ease: "elastic.out(1, 0.5)",
    force3D: true,
    transformOrigin: "center center"
  }, "-=0.8")

  // 移除上下摆动动画，保持静态位置

  // 移除3D旋转效果，保持文字静态清晰
}

// 启动循环动画 - 移除点亮效果
const startLoopAnimations = () => {
  console.log('启动颜色循环动画')
  // 不再有点亮效果，只保留颜色变化
}





// 背景动画元素
const initBackgroundAnimations = () => {
  // 创建浮动的几何图形
  backgroundElements.value.forEach((element, index) => {
    gsap.set(element, {
      opacity: 0.1 + Math.random() * 0.3,
      scale: 0.5 + Math.random() * 0.5,
      rotation: Math.random() * 360
    })

    // 随机浮动动画
    gsap.to(element, {
      y: `+=${Math.random() * 200 - 100}`,
      x: `+=${Math.random() * 100 - 50}`,
      rotation: `+=${Math.random() * 180 - 90}`,
      duration: 10 + Math.random() * 10,
      ease: "none",
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 2
    })

    // 缩放动画
    gsap.to(element, {
      scale: `+=${Math.random() * 0.3}`,
      duration: 5 + Math.random() * 5,
      ease: "power2.inOut",
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 3
    })
  })
}

// 移除滚动触发动画，避免奇怪的translate
const initScrollAnimations = () => {
  // 不再使用滚动视差效果
}

// 交互元素
const initInteractiveElements = () => {
  // 鼠标移动视差效果
  document.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window

    const xPercent = (clientX / innerWidth - 0.5) * 2
    const yPercent = (clientY / innerHeight - 0.5) * 2

    gsap.to(mainTitle.value, {
      x: Math.round(xPercent * 5),
      y: Math.round(yPercent * 3),
      duration: 0.8,
      ease: "power2.out",
      force3D: true
    })

    gsap.to(subtitle.value, {
      x: Math.round(xPercent * 3),
      y: Math.round(yPercent * 2),
      duration: 1,
      ease: "power2.out",
      force3D: true
    })

    // 背景元素视差
    backgroundElements.value.forEach((element, index) => {
      const multiplier = (index + 1) * 0.5
      gsap.to(element, {
        x: xPercent * multiplier * 10,
        y: yPercent * multiplier * 10,
        duration: 0.8,
        ease: "power2.out"
      })
    })
  })
}

// 按钮动画
const initButtonAnimations = () => {
  if (!enterButton.value) return

  // 设置初始状态 - 防止模糊
  gsap.set(enterButton.value, {
    opacity: 0,
    y: 30,
    scale: 0.9,
    force3D: true,
    transformOrigin: "center center"
  })

  // 延迟出现动画
  gsap.to(enterButton.value, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 1,
    ease: "back.out(1.7)",
    delay: 2,
    force3D: true
  })

  // 悬停效果
  enterButton.value.addEventListener('mouseenter', () => {
    gsap.to(enterButton.value, {
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out"
    })

    gsap.to(enterButton.value?.querySelector('.button-glow'), {
      opacity: 1,
      scale: 1.2,
      duration: 0.3,
      ease: "power2.out"
    })
  })

  enterButton.value.addEventListener('mouseleave', () => {
    gsap.to(enterButton.value, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    })

    gsap.to(enterButton.value?.querySelector('.button-glow'), {
      opacity: 0.5,
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    })
  })

  // 点击效果
  enterButton.value.addEventListener('mousedown', () => {
    gsap.to(enterButton.value, {
      scale: 0.95,
      duration: 0.1,
      ease: "power2.out"
    })
  })

  enterButton.value.addEventListener('mouseup', () => {
    gsap.to(enterButton.value, {
      scale: 1.05,
      duration: 0.1,
      ease: "power2.out"
    })
  })
}
</script>

<template>
  <div class="home-container">
    <!-- 顶部导航栏 -->
    <TopBar />

    <!-- 粒子背景 -->
    <ParticleBackground />

    <!-- 背景动画元素 -->
    <div class="background-elements">
      <div
        v-for="i in 12"
        :key="i"
        :ref="el => backgroundElements.push(el as HTMLElement)"
        class="bg-element"
        :class="`bg-element-${i % 4 + 1}`"
      ></div>
    </div>

    <!-- 主要内容区域 -->
    <div ref="heroSection" class="hero-section">
      <div class="hero-content">
        <!-- 主标题 -->
        <h1 ref="mainTitle" class="main-title">
          <!-- 中文：显示为一个完整span -->
          <span v-if="locale === 'zh'" class="title-word">{{ $t('home.title') }}</span>
          <!-- 英文：拆分为多个span -->
          <template v-else>
            <span class="title-word">Chat</span>
            <span class="title-word">in</span>
            <span class="title-word">the</span>
            <span class="title-word highlight">Third</span>
            <span class="title-word highlight">Dimension</span>
          </template>
        </h1>

        <!-- 副标题 -->
        <h2 ref="subtitle" class="subtitle">
          {{ $t('home.subtitle') }}
        </h2>

        <!-- 进入按钮 -->
        <div class="cta-section">
          <button ref="enterButton" class="enter-button" @click="enterChat">
            <span class="button-text">{{ $t('home.enterButton') }}</span>
            <div class="button-glow"></div>
            <div class="button-particles"></div>
          </button>
          <p class="description">{{ $t('home.description') }}</p>
        </div>

        <!-- 装饰性元素 -->
        <div class="decorative-elements">
          <div class="floating-cube"></div>
          <div class="floating-sphere"></div>
          <div class="floating-pyramid"></div>
        </div>
      </div>
    </div>

    <!-- 渐变遮罩 -->
    <div class="gradient-overlay"></div>
  </div>
</template>

<style scoped lang="less">
.home-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 60px; /* 为topbar留出空间 */
}

// 背景动画元素
.background-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.bg-element {
  position: absolute;
  border-radius: 50%;

  &.bg-element-1 {
    width: 120px;
    height: 120px;
    background: linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1));
    top: 10%;
    left: 10%;
    border-radius: 20px;
  }

  &.bg-element-2 {
    width: 80px;
    height: 80px;
    background: linear-gradient(45deg, rgba(255, 255, 0, 0.1), rgba(255, 0, 0, 0.1));
    top: 20%;
    right: 15%;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  }

  &.bg-element-3 {
    width: 100px;
    height: 100px;
    background: linear-gradient(45deg, rgba(0, 255, 0, 0.1), rgba(0, 0, 255, 0.1));
    bottom: 20%;
    left: 20%;
  }

  &.bg-element-4 {
    width: 60px;
    height: 60px;
    background: linear-gradient(45deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1));
    bottom: 30%;
    right: 25%;
    border-radius: 10px;
    transform: rotate(45deg);
  }
}

// 主要内容区域
.hero-section {
  position: relative;
  width: 100vw;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.hero-content {
  text-align: center;
  position: relative;
  z-index: 3;
  width: 100%;
  max-width: 1200px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

// 主标题样式
.main-title {
  font-size: clamp(2.5rem, 6vw, 6rem);
  font-weight: 900;
  line-height: 1.2;
  margin: 0 auto 1rem;
  text-align: center;
  width: 100%;
  max-width: 1200px;
  padding: 0 1rem;
  color: #00ffff !important;
  background: linear-gradient(
    90deg,
    #00ffff 0%,
    #ff00ff 25%,
    #ffff00 50%,
    #ff00ff 75%,
    #00ffff 100%
  );
  background-size: 400% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: colorCycle 4s linear infinite;



  .title-word {
    display: inline-block;
    margin: 0 0.2em;
    color: #00ffff !important;
    background: linear-gradient(
      90deg,
      #00ffff 0%,
      #ff00ff 25%,
      #ffff00 50%,
      #ff00ff 75%,
      #00ffff 100%
    );
    background-size: 400% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: colorCycle 4s linear infinite;

    &.highlight {
      color: #00ffff !important;
      background: linear-gradient(
        90deg,
        #00ffff 0%,
        #ff00ff 25%,
        #ffff00 50%,
        #ff00ff 75%,
        #00ffff 100%
      );
      background-size: 400% 100%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: colorCycle 4s linear infinite;
    }
  }
}

// 副标题样式
.subtitle {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 700;
  margin: 2rem auto;
  color: #00ffff !important;
  background: linear-gradient(
    90deg,
    #00ffff 0%,
    #ff00ff 25%,
    #ffff00 50%,
    #ff00ff 75%,
    #00ffff 100%
  );
  background-size: 400% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: colorCycle 4s linear infinite;
  letter-spacing: 0.1em;
  text-align: center !important;
  width: 100% !important;



  &::before,
  &::after {
    content: '';
    display: inline-block;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    margin: 0 20px;
    vertical-align: middle;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
  }
}

// CTA区域样式
.cta-section {
  margin: 3rem auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  width: 100%;
  text-align: center;
}

.enter-button {
  position: relative;
  padding: 1rem 2.5rem;
  background: linear-gradient(45deg, #00d4ff, #ff00ff);
  border: none;
  border-radius: 50px;
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 10px 30px rgba(0, 212, 255, 0.4);



  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }

  .button-text {
    position: relative;
    z-index: 2;

  }

  .button-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(0, 212, 255, 0.4), transparent 70%);
    opacity: 0.5;
    z-index: 1;
  }
}

.description {
  color: #00ffff !important;
  background: linear-gradient(
    90deg,
    #00ffff 0%,
    #ff00ff 25%,
    #ffff00 50%,
    #ff00ff 75%,
    #00ffff 100%
  );
  background-size: 400% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: colorCycle 4s linear infinite;
  font-size: 1.1rem;
  text-align: center;
  max-width: 500px;
  line-height: 1.6;
  margin: 0 auto;
  width: 100%;


}

// 装饰性3D元素
.decorative-elements {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.floating-cube,
.floating-sphere,
.floating-pyramid {
  position: absolute;
  opacity: 0.3;
}

.floating-cube {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  top: 20%;
  left: 80%;
  transform: rotateX(45deg) rotateY(45deg);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
}

.floating-sphere {
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, #ffff00, #ff00ff);
  border-radius: 50%;
  top: 70%;
  left: 15%;
  box-shadow: 0 0 15px rgba(255, 255, 0, 0.5);
}

.floating-pyramid {
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-bottom: 35px solid #00ffff;
  top: 30%;
  right: 20%;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
}

// 渐变遮罩
.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 40%,
    rgba(0, 0, 0, 0.3) 100%
  );
  pointer-events: none;
  z-index: 4;
}

// 动画关键帧
@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes colorCycle {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}







// 大屏幕优化
@media (min-width: 1200px) {
  .main-title {
    font-size: clamp(4rem, 5vw, 6rem);
  }

  .subtitle {
    font-size: clamp(2.5rem, 3vw, 4rem);
  }
}

// 中等屏幕
@media (max-width: 1024px) and (min-width: 769px) {
  .main-title {
    font-size: clamp(2.5rem, 5vw, 4rem);
  }
}

// 小屏幕响应式设计
@media (max-width: 768px) {
  .home-container {
    padding-top: 50px; /* 移动端topbar高度 */
  }

  .main-title {
    font-size: clamp(1.8rem, 8vw, 3rem);
    white-space: normal;
    line-height: 1.1;

    .title-word {
      display: inline-block;
      margin: 0 0.1em;

      &:nth-child(3)::after {
        content: '\A';
        white-space: pre;
      }
    }
  }
}

  .subtitle {
    font-size: clamp(1.5rem, 8vw, 2.5rem);

    &::before,
    &::after {
      width: 30px;
      margin: 0 10px;
    }
  }

  .enter-button {
    padding: 0.8rem 2rem;
    font-size: 1rem;
  }

  .description {
    font-size: 1rem;
    padding: 0 1rem;
  }

  .cta-section {
    margin-top: 2rem;
    gap: 1rem;
  }

  .bg-element {
    &.bg-element-1 { width: 80px; height: 80px; }
    &.bg-element-2 { width: 60px; height: 60px; }
    &.bg-element-3 { width: 70px; height: 70px; }
    &.bg-element-4 { width: 40px; height: 40px; }
  }

@media (max-width: 480px) {
  .home-container {
    padding-top: 45px; /* 超小屏幕topbar高度 */
  }

  .main-title {
    font-size: clamp(1.5rem, 10vw, 2.5rem);
  }

  .subtitle {
    font-size: clamp(1.2rem, 6vw, 2rem);
  }
}

// 确保所有内容居中显示
.home-container,
.hero-section,
.hero-content {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

// 强制重置hero-section的transform，但保留文字的动画transform
.hero-section {
  transform: none !important;
  position: relative;
  overflow: hidden;
}



.main-title,
.subtitle,
.cta-section {
  text-align: center !important;
  width: 100% !important;
}

// 统一文字颜色 - 恢复颜色循环动画
.main-title,
.subtitle,
.description,
.title-word {
  color: #00ffff !important;
  background: linear-gradient(
    90deg,
    #00ffff 0%,
    #ff00ff 25%,
    #ffff00 50%,
    #ff00ff 75%,
    #00ffff 100%
  ) !important;
  background-size: 400% 100% !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  animation: colorCycle 4s linear infinite !important;
}
</style>