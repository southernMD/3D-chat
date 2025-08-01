<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { gsap } from 'gsap'
import { TextPlugin } from 'gsap/TextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { useI18n } from 'vue-i18n'
import ParticleBackground from '@/components/ParticleBackground.vue'
import TopBar from '@/components/TopBar.vue'
import ModeSelection from '@/components/ModeSelection.vue'

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
const homeContainer = ref<HTMLElement>()
const descriptionRef = ref<HTMLElement>()
const decorativeElements = ref<HTMLElement>()

// 模式选择状态
const showModeSelection = ref(false)

// 滚动控制
let currentSection = 0 // 当前所在的区域 (0: top-item, 1: mid-item)
const totalSections = 2
let isScrolling = false // 防止滚动过快

// 计算属性：根据语言判断是否为中文
const isChinese = computed(() => locale.value === 'zh')

// 滚动到指定区域
const scrollToSection = (sectionIndex: number) => {
  if (isScrolling || !homeContainer.value) return

  isScrolling = true
  currentSection = Math.max(0, Math.min(sectionIndex, totalSections - 1))

  const targetScrollTop = currentSection * window.innerHeight

  // 使用 GSAP 平滑滚动
  gsap.to(homeContainer.value, {
    scrollTop: targetScrollTop,
    duration: 0.8,
    ease: "power2.inOut",
    onComplete: () => {
      isScrolling = false
    }
  })
}

// 处理滚轮事件
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()

  if (isScrolling) return

  if (event.deltaY > 0) {
    // 向下滚动
    scrollToSection(currentSection + 1)
  } else {
    // 向上滚动
    scrollToSection(currentSection - 1)
  }
}

onMounted(() => {
  // 初始化动画
  initHeroAnimations()
  initBackgroundAnimations()
  // initScrollAnimations() // 移除滚动动画
  initInteractiveElements()
  initButtonAnimations()

  // 添加滚轮事件监听器
  if (homeContainer.value) {
    // homeContainer.value.addEventListener('wheel', handleWheel, { passive: false })
  }
})

// 组件卸载时清理事件监听器和动画
onUnmounted(() => {
  console.log('Home component unmounting - cleaning up animations')

  // 移除鼠标移动事件监听器
  document.removeEventListener('mousemove', handleMouseMove)

  // 停止所有GSAP动画
  gsap.killTweensOf("*")
  gsap.globalTimeline.clear()

  // 移除事件监听器
  if (homeContainer.value) {
    homeContainer.value.removeEventListener('wheel', handleWheel)
  }
})

// 进入聊天功能
const enterChat = () => {
  console.log('Entering chat - stopping all GSAP animations')

  // 移除鼠标移动事件监听器，防止继续触发视差动画
  document.removeEventListener('mousemove', handleMouseMove)

  // 停止所有GSAP动画和时间线
  gsap.killTweensOf("*") // 停止所有动画
  gsap.globalTimeline.clear() // 清除全局时间线

  // 停止特定元素的动画
  const elementsToStop = [
    mainTitle.value,
    subtitle.value,
    enterButton.value,
    descriptionRef.value,
    decorativeElements.value,
    ...backgroundElements.value
  ].filter(Boolean)

  gsap.killTweensOf(elementsToStop)

  // 创建淡出动画
  const exitTl = gsap.timeline()

  // 淡出原有元素
  exitTl.to([mainTitle.value, subtitle.value, enterButton.value, descriptionRef.value], {
    opacity: 0,
    y: -50,
    scale: 0.8,
    duration: 0.8,
    ease: "power2.in",
    stagger: 0.1
  })

  // 淡出背景元素
  if (decorativeElements.value) {
    exitTl.to(decorativeElements.value, {
      opacity: 0,
      scale: 0.8,
      duration: 0.6,
      ease: "power2.in"
    }, "-=0.4")
  }

  // 动画完成后显示模式选择
  exitTl.call(() => {
    showModeSelection.value = true
  })
}

// 处理模式选择
const handleModeSelected = (mode: 'create' | 'join') => {
  console.log(`Selected mode: ${mode}`)
  // 这里可以路由到对应的页面
  showModeSelection.value = false
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

  // 设置描述文字初始状态
  const description = document.querySelector('.description')
  if (description) {
    gsap.set(description, {
      opacity: 0,
      y: 50,
      scale: 0.9
    })
  }

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

  // 设置描述文字初始状态
  if (descriptionRef.value) {
    gsap.set(descriptionRef.value, {
      opacity: 0,
      y: 50,
      scale: 0.9
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

  // 描述文字动画
  if (descriptionRef.value) {
    masterTl.to(descriptionRef.value, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.4")
  }

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

// 鼠标移动处理函数
const handleMouseMove = (e: MouseEvent) => {
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
}

// 交互元素
const initInteractiveElements = () => {
  // 鼠标移动视差效果
  document.addEventListener('mousemove', handleMouseMove)
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
  <div ref="homeContainer" class="home-container">
    <!-- 顶部导航栏 -->
    <TopBar />

    <!-- 粒子背景 - 固定在屏幕底部 -->
    <ParticleBackground />

    <!-- 内容包装器 -->
    <div class="content-wrapper">
      <!-- 模式选择组件 -->
      <ModeSelection
        v-if="showModeSelection"
        :visible="showModeSelection"
        @mode-selected="handleModeSelected"
      />

      <!-- 原始内容 -->
      <template v-if="!showModeSelection">
        <!-- 背景动画元素 -->
        <div class="top-item">
        <div class="background-elements">
          <div v-for="i in 12" :key="i" :ref="el => backgroundElements.push(el as HTMLElement)" class="bg-element"
            :class="`bg-element-${i % 4 + 1}`"></div>
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
              <p ref="descriptionRef" class="description">{{ $t('home.description') }}</p>
            </div>

            <!-- 装饰性元素 -->
            <div ref="decorativeElements" class="decorative-elements">
              <div class="floating-cube"></div>
              <div class="floating-sphere"></div>
              <div class="floating-pyramid"></div>
            </div>


          </div>
        </div>

        <!-- 渐变遮罩 -->
        <div class="gradient-overlay"></div>
      </div>

      <!-- mid-item 包含竖向滚动区域 -->
      <div class="mid-item">
        <!-- 竖向滚动容器 -->
        <div class="v-scroll">
          <div class="content">
            <!-- 第一个面板 -->
            <div class="horizontal-panel panel-1">
              <div class="panel-content">
                <h2 class="panel-title">{{ $t('horizontal.panel1.title') }}</h2>
                <p class="panel-description">{{ $t('horizontal.panel1.description') }}</p>
                <div class="panel-features">
                  <div class="feature-item">
                    <div class="feature-icon">🌐</div>
                    <h3>{{ $t('horizontal.panel1.feature1') }}</h3>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">🎮</div>
                    <h3>{{ $t('horizontal.panel1.feature2') }}</h3>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">🚀</div>
                    <h3>{{ $t('horizontal.panel1.feature3') }}</h3>
                  </div>
                </div>
              </div>
            </div>

            <!-- 第二个面板 -->
            <div class="horizontal-panel panel-2">
              <div class="panel-content">
                <h2 class="panel-title">{{ $t('horizontal.panel2.title') }}</h2>
                <p class="panel-description">{{ $t('horizontal.panel2.description') }}</p>
                <div class="tech-grid">
                  <div class="tech-item">WebGL</div>
                  <div class="tech-item">Three.js</div>
                  <div class="tech-item">WebRTC</div>
                  <div class="tech-item">Vue 3</div>
                  <div class="tech-item">TypeScript</div>
                  <div class="tech-item">GSAP</div>
                </div>
              </div>
            </div>

            <!-- 第三个面板 -->
            <div class="horizontal-panel panel-3">
              <div class="panel-content">
                <h2 class="panel-title">{{ $t('horizontal.panel3.title') }}</h2>
                <p class="panel-description">{{ $t('horizontal.panel3.description') }}</p>
                <div class="demo-showcase">
                  <div class="demo-item">
                    <div class="demo-preview"></div>
                    <h4>3D Avatar</h4>
                  </div>
                  <div class="demo-item">
                    <div class="demo-preview"></div>
                    <h4>Voice Chat</h4>
                  </div>
                  <div class="demo-item">
                    <div class="demo-preview"></div>
                    <h4>Virtual Rooms</h4>
                  </div>
                </div>
              </div>
            </div>

            <!-- 第四个面板 -->
            <div class="horizontal-panel panel-4">
              <div class="panel-content">
                <h2 class="panel-title">{{ $t('horizontal.panel4.title') }}</h2>
                <p class="panel-description">{{ $t('horizontal.panel4.description') }}</p>
                <div class="cta-buttons">
                  <button class="cta-primary">{{ $t('horizontal.panel4.primaryCta') }}</button>
                  <button class="cta-secondary">{{ $t('horizontal.panel4.secondaryCta') }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-item">
        <footer class="main-footer">
          <!-- 背景动画元素 -->
          <div class="footer-bg-elements">
            <div class="floating-orb orb-1"></div>
            <div class="floating-orb orb-2"></div>
            <div class="floating-orb orb-3"></div>
            <div class="grid-overlay"></div>
          </div>

          <!-- 主要内容 -->
          <div class="footer-content">
            <!-- 顶部区域 -->
            <div class="footer-top">
              <div class="footer-brand">
                <div class="brand-logo">
                  <div class="logo-cube">
                    <div class="cube-face front">3D</div>
                    <div class="cube-face back">CHAT</div>
                    <div class="cube-face right">3D</div>
                    <div class="cube-face left">CHAT</div>
                    <div class="cube-face top">3D</div>
                    <div class="cube-face bottom">CHAT</div>
                  </div>
                </div>
                <div class="brand-text">
                  <h2 class="brand-title">NEXUS³</h2>
                  <p class="brand-subtitle">{{ $t('footer.subtitle') }}</p>
                </div>
              </div>

              <div class="footer-links">
                <div class="link-group">
                  <h3>{{ $t('footer.product') }}</h3>
                  <ul>
                    <li><a href="#features">{{ $t('footer.features') }}</a></li>
                    <li><a href="#pricing">{{ $t('footer.pricing') }}</a></li>
                    <li><a href="#demo">{{ $t('footer.demo') }}</a></li>
                    <li><a href="#api">{{ $t('footer.api') }}</a></li>
                  </ul>
                </div>

                <div class="link-group">
                  <h3>{{ $t('footer.company') }}</h3>
                  <ul>
                    <li><a href="#about">{{ $t('footer.about') }}</a></li>
                    <li><a href="#team">{{ $t('footer.team') }}</a></li>
                    <li><a href="#careers">{{ $t('footer.careers') }}</a></li>
                    <li><a href="#contact">{{ $t('footer.contact') }}</a></li>
                  </ul>
                </div>

                <div class="link-group">
                  <h3>{{ $t('footer.resources') }}</h3>
                  <ul>
                    <li><a href="#docs">{{ $t('footer.documentation') }}</a></li>
                    <li><a href="#blog">{{ $t('footer.blog') }}</a></li>
                    <li><a href="#support">{{ $t('footer.support') }}</a></li>
                    <li><a href="#community">{{ $t('footer.community') }}</a></li>
                  </ul>
                </div>

                <div class="link-group">
                  <h3>{{ $t('footer.connect') }}</h3>
                  <div class="social-links">
                    <a href="#" class="social-link">
                      <div class="social-icon github">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </div>
                    </a>
                    <a href="#" class="social-link">
                      <div class="social-icon twitter">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </div>
                    </a>
                    <a href="#" class="social-link">
                      <div class="social-icon discord">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                        </svg>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分割线 -->
            <div class="footer-divider">
              <div class="divider-line"></div>
              <div class="divider-glow"></div>
            </div>

            <!-- 底部区域 -->
            <div class="footer-bottom">
              <div class="footer-bottom-left">
                <p class="copyright">
                  © 2024 3D Chat. {{ $t('footer.allRightsReserved') }}
                </p>
                <div class="legal-links">
                  <a href="#privacy">{{ $t('footer.privacy') }}</a>
                  <a href="#terms">{{ $t('footer.terms') }}</a>
                  <a href="#cookies">{{ $t('footer.cookies') }}</a>
                </div>
              </div>

              <div class="footer-bottom-right">
                <div class="tech-badge">
                  <span class="badge-text">{{ $t('footer.poweredBy') }}</span>
                  <div class="tech-stack">
                    <span class="tech-item">WebRTC</span>
                    <span class="tech-item">Three.js</span>
                    <span class="tech-item">Vue 3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.home-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  /* 固定高度 */
  overflow-x: hidden;
  overflow-y: auto;
  /* 显示彩虹滚动条 */
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 内容包装器 - 这是关键 */
.content-wrapper {
  display: flex;
  flex-direction: column;
  padding-top: 60px;
  /* 为topbar留出空间 */
  // height: calc(200vh + 60px);
  /* 强制高度，确保内容足够高可以滚动 */
}

// top-item 容器
.top-item {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  flex-shrink: 0;
}

// mid-item 容器
.mid-item {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  flex-shrink: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
}

.footer-item {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}

// 主要 Footer 样式
.main-footer {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #ffffff;
  overflow: hidden;

  // 添加整体发光效果
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(0, 255, 255, 0.3) 25%,
      rgba(255, 0, 255, 0.3) 50%,
      rgba(0, 255, 255, 0.3) 75%,
      transparent 100%
    );
    animation: footerGlow 3s ease-in-out infinite;
  }
}

@keyframes footerGlow {
  0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1.2); }
}

// 背景动画元素
.footer-bg-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.1) 100%);
  filter: blur(1px);
  animation: float 6s ease-in-out infinite;

  &.orb-1 {
    width: 120px;
    height: 120px;
    top: 20%;
    left: 10%;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 80px;
    height: 80px;
    top: 60%;
    right: 15%;
    animation-delay: 2s;
  }

  &.orb-3 {
    width: 100px;
    height: 100px;
    bottom: 20%;
    left: 70%;
    animation-delay: 4s;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.3;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

// Footer 内容区域
.footer-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 60px 80px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

// 顶部区域
.footer-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 80px;
  margin-bottom: 60px;
}

// 品牌区域
.footer-brand {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 0 0 auto;
}

.brand-logo {
  perspective: 1000px;
}

.logo-cube {
  position: relative;
  width: 60px;
  height: 60px;
  transform-style: preserve-3d;
  animation: rotateCube 10s linear infinite, cubePulse 2s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));

  &:hover {
    animation-duration: 2s, 1s;
  }
}

.cube-face {
  position: absolute;
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  color: #000;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);

  &.front { transform: rotateY(0deg) translateZ(30px); }
  &.back { transform: rotateY(180deg) translateZ(30px); }
  &.right { transform: rotateY(90deg) translateZ(30px); }
  &.left { transform: rotateY(-90deg) translateZ(30px); }
  &.top { transform: rotateX(90deg) translateZ(30px); }
  &.bottom { transform: rotateX(-90deg) translateZ(30px); }

  &:hover {
    background: linear-gradient(45deg, rgba(0, 255, 255, 0.8), rgba(255, 0, 255, 0.8));
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.3);
  }
}

@keyframes cubePulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 30px rgba(0, 255, 255, 0.8));
  }
}

@keyframes rotateCube {
  0% { transform: rotateX(0deg) rotateY(0deg); }
  100% { transform: rotateX(360deg) rotateY(360deg); }
}

.brand-text {
  .brand-title {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(45deg, #00ffff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }

  .brand-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }
}

// 链接区域
.footer-links {
  display: flex;
  gap: 60px;
  flex: 1;
}

.link-group {
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 20px;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      width: 30px;
      height: 2px;
      background: linear-gradient(45deg, #00ffff, #ff00ff);
    }
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      margin-bottom: 12px;

      a {
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        font-size: 14px;
        transition: all 0.3s ease;
        position: relative;

        &:hover {
          color: #00ffff;
          transform: translateX(5px);
        }

        &::before {
          content: '';
          position: absolute;
          left: -15px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 2px;
          background: #00ffff;
          transition: width 0.3s ease;
        }

        &:hover::before {
          width: 10px;
        }
      }
    }
  }
}

// 社交链接
.social-links {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.social-link {
  display: block;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-4px) scale(1.1);
    background: rgba(0, 255, 255, 0.2);
    border-color: #00ffff;
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.3);

    &::before {
      left: 100%;
    }
  }
}

.social-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;

  svg {
    width: 20px;
    height: 20px;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.3s ease;
    filter: drop-shadow(0 0 3px currentColor);
  }

  &.github:hover svg {
    color: #ffffff;
    transform: rotate(360deg);
    filter: drop-shadow(0 0 8px currentColor);
  }
  &.twitter:hover svg {
    color: #1da1f2;
    transform: rotate(360deg);
    filter: drop-shadow(0 0 8px currentColor);
  }
  &.discord:hover svg {
    color: #5865f2;
    transform: rotate(360deg);
    filter: drop-shadow(0 0 8px currentColor);
  }
}

// 分割线
.footer-divider {
  position: relative;
  height: 1px;
  margin: 40px 0;
}

.divider-line {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.divider-glow {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 5px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), transparent);
  filter: blur(3px);
}

// 底部区域
.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
}

.footer-bottom-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.copyright {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.legal-links {
  display: flex;
  gap: 24px;

  a {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: #00ffff;
    }
  }
}

.footer-bottom-right {
  display: flex;
  align-items: center;
}

.tech-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 25px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.badge-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tech-stack {
  display: flex;
  gap: 8px;
}

.tech-item {
  font-size: 11px;
  padding: 4px 8px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  color: #000;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

// 响应式设计
@media (max-width: 1200px) {
  .footer-content {
    padding: 40px 60px 30px;
  }

  .footer-top {
    gap: 60px;
  }

  .footer-links {
    gap: 40px;
  }
}

@media (max-width: 768px) {
  .footer-content {
    padding: 30px 20px;
  }

  .footer-top {
    flex-direction: column;
    gap: 40px;
    text-align: center;
  }

  .footer-links {
    flex-wrap: wrap;
    gap: 30px;
    justify-content: center;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .legal-links {
    justify-content: center;
  }
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
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
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
  background: linear-gradient(90deg,
      #00ffff 0%,
      #ff00ff 25%,
      #ffff00 50%,
      #ff00ff 75%,
      #00ffff 100%);
  background-size: 400% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: colorCycle 4s linear infinite;



  .title-word {
    display: inline-block;
    margin: 0 0.2em;
    color: #00ffff !important;
    background: linear-gradient(90deg,
        #00ffff 0%,
        #ff00ff 25%,
        #ffff00 50%,
        #ff00ff 75%,
        #00ffff 100%);
    background-size: 400% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: colorCycle 4s linear infinite;

    &.highlight {
      color: #00ffff !important;
      background: linear-gradient(90deg,
          #00ffff 0%,
          #ff00ff 25%,
          #ffff00 50%,
          #ff00ff 75%,
          #00ffff 100%);
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
  background: linear-gradient(90deg,
      #00ffff 0%,
      #ff00ff 25%,
      #ffff00 50%,
      #ff00ff 75%,
      #00ffff 100%);
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
  background: linear-gradient(90deg,
      #00ffff 0%,
      #ff00ff 25%,
      #ffff00 50%,
      #ff00ff 75%,
      #00ffff 100%);
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
  background: radial-gradient(ellipse at center,
      transparent 0%,
      transparent 40%,
      rgba(0, 0, 0, 0.3) 100%);
  pointer-events: none;
  z-index: 4;
}

// 竖向滚动区域样式 - 按照你的要求实现
.v-scroll {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vh; /* 宽度为100vh */
  height: 100vw; /* 高度为100vw */
  scroll-behavior: smooth;
  transform-origin:left top ;
  transform: translateY(100vh) rotate(-90deg);
  overflow: hidden scroll;
}

.v-scroll::-webkit-scrollbar {
  display: none;
}

.content {
  display: flex;
  width: 100vw; /* 4个面板的总宽度 */
  height: 100vh; /* 内容高度 */
  transform: rotate(90deg); /* content顺时针旋转90度 */
  position: absolute;
  left: 100vh;
  transform-origin: left top;
  transform: rotate(90deg);
}

/* horizontal-container 现在由 content 替代 */

.horizontal-panel {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.panel-content {
  max-width: 800px;
  padding: 2rem;
  text-align: center;
  color: #ffffff;
}

.panel-title {
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #00ffff;
  background: linear-gradient(90deg,
      #00ffff 0%,
      #ff00ff 25%,
      #ffff00 50%,
      #ff00ff 75%,
      #00ffff 100%);
  background-size: 400% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: colorCycle 4s linear infinite;
}

.panel-description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
}

// 面板特定样式
.panel-1 {
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
}

.panel-2 {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.panel-3 {
  background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
}

.panel-4 {
  background: linear-gradient(135deg, #0f3460 0%, #0a0a0a 100%);
}

// 功能特性网格
.panel-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-item {
  text-align: center;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    transform: translateY(-5px);
  }
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

// 技术栈网格
.tech-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 2rem;
}

.tech-item {
  padding: 1rem;
  background: rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  color: #00ffff;
  border: 1px solid rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    transform: scale(1.05);
  }
}

// 演示展示
.demo-showcase {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 2rem;
}

.demo-item {
  text-align: center;
}

.demo-preview {
  width: 100%;
  height: 120px;
  background: linear-gradient(45deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.2));
  border-radius: 10px;
  margin-bottom: 1rem;
  border: 1px solid rgba(0, 255, 255, 0.3);
}

// CTA按钮
.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.cta-primary,
.cta-secondary {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cta-primary {
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  color: #000;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 255, 255, 0.3);
  }
}

.cta-secondary {
  background: transparent;
  color: #00ffff;
  border: 2px solid #00ffff;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    transform: translateY(-2px);
  }
}

// 动画关键帧
@keyframes gradientShift {

  0%,
  100% {
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
    padding-top: 50px;
    /* 移动端topbar高度 */
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
  &.bg-element-1 {
    width: 80px;
    height: 80px;
  }

  &.bg-element-2 {
    width: 60px;
    height: 60px;
  }

  &.bg-element-3 {
    width: 70px;
    height: 70px;
  }

  &.bg-element-4 {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .home-container {
    padding-top: 45px;
    /* 超小屏幕topbar高度 */
  }

  .main-title {
    font-size: clamp(1.5rem, 10vw, 2.5rem);
  }

  .subtitle {
    font-size: clamp(1.2rem, 6vw, 2rem);
  }
}

// 确保所有内容居中显示
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
  background: linear-gradient(90deg,
      #00ffff 0%,
      #ff00ff 25%,
      #ffff00 50%,
      #ff00ff 75%,
      #00ffff 100%) !important;
  background-size: 400% 100% !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  animation: colorCycle 4s linear infinite !important;
}
</style>