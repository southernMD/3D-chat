<template>
  <div class="topbar">
    <!-- 左侧品牌标志 -->
    <div class="topbar-brand">
      <h1 class="brand-text" @click="handleBrandClick">{{ $t('nav.brand') }}</h1>
    </div>

    <!-- 右侧操作区域 -->
    <div class="topbar-actions">
      <!-- 登录区域 -->
      <div class="auth-section">
        <!-- 未登录状态 -->
        <div v-if="!isLoggedIn" class="login-area">
          <button class="login-button" @click="handleLogin">
            <span class="login-icon">👤</span>
            <span class="login-text">登录</span>
          </button>
        </div>

        <!-- 已登录状态 -->
        <div v-else class="user-area">
          <div class="user-info" @click="toggleUserMenu" :class="{ active: showUserMenu }">
            <span class="user-avatar">👤</span>
            <span class="username">{{ username }}</span>
            <span class="dropdown-arrow" :class="{ rotated: showUserMenu }">▼</span>
          </div>

          <div class="user-menu" v-show="showUserMenu">
            <button class="user-option" @click="handleProfile">
              <span class="option-icon">⚙️</span>
              <span>个人设置</span>
            </button>
            <button class="user-option" @click="handleLogout">
              <span class="option-icon">🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
      <div class="language-selector">
        <button 
          class="language-button"
          @click="toggleLanguageMenu"
          :class="{ active: showLanguageMenu }"
        >
          <span class="language-icon">🌐</span>
          <span class="language-text">{{ $t('nav.language') }}</span>
          <span class="dropdown-arrow" :class="{ rotated: showLanguageMenu }">▼</span>
        </button>
        
        <div class="language-menu" v-show="showLanguageMenu">
          <button 
            class="language-option"
            :class="{ active: currentLocale === 'zh' }"
            @click="changeLanguage('zh')"
          >
            <span class="flag">🇨🇳</span>
            <span>中文</span>
          </button>
          <button 
            class="language-option"
            :class="{ active: currentLocale === 'en' }"
            @click="changeLanguage('en')"
          >
            <span class="flag">🇺🇸</span>
            <span>English</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'

const { locale, t } = useI18n()
const router = useRouter()
const route = useRoute()

const showLanguageMenu = ref(false)
const showUserMenu = ref(false)

// 登录状态管理
const isLoggedIn = ref(false)
const username = ref('')

const currentLocale = computed(() => locale.value)

// 品牌点击处理
const handleBrandClick = () => {
  console.log('Brand clicked, current route:', route.path)

  if (route.path === '/home' || route.path === '/') {
    // 如果在home页面，刷新页面
    window.location.reload()
  } else {
    // 如果不在home页面，导航到home页面
    router.push('/home')
  }
}

// 登录相关功能
const handleLogin = () => {
  // 这里可以打开登录弹窗或跳转到登录页面
  console.log('Login clicked')
  // 模拟登录成功
  isLoggedIn.value = true
  username.value = '用户' + Math.floor(Math.random() * 1000)
}

const handleLogout = () => {
  isLoggedIn.value = false
  username.value = ''
  showUserMenu.value = false
  console.log('User logged out')
}

const handleProfile = () => {
  console.log('Profile clicked')
  showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const toggleLanguageMenu = () => {
  showLanguageMenu.value = !showLanguageMenu.value
}

const changeLanguage = (lang: string) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
  showLanguageMenu.value = false
}

// 点击外部关闭菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.language-selector')) {
    showLanguageMenu.value = false
  }
  if (!target.closest('.auth-section')) {
    showUserMenu.value = false
  }
}

// 调整TopBar宽度避免盖住滚动条
const adjustTopBarWidth = () => {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  const topbar = document.querySelector('.topbar') as HTMLElement
  if (topbar && scrollbarWidth > 0) {
    topbar.style.width = `calc(100% - ${scrollbarWidth}px)`
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  adjustTopBarWidth()
  window.addEventListener('resize', adjustTopBarWidth)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', adjustTopBarWidth)
})
</script>

<style scoped lang="less">
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  width: calc(100% - 8px);
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 1000;
  box-sizing: border-box;
  /* 不覆盖滚动条 */
  margin-right: 0;
}

.topbar-brand {
  .brand-text {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #00ffff;
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
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.05);
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }
  }
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auth-section {
  position: relative;
}

.login-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 0, 255, 0.1);
  border: 1px solid rgba(255, 0, 255, 0.3);
  border-radius: 25px;
  color: #ff00ff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 0, 255, 0.2);
    border-color: rgba(255, 0, 255, 0.5);
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    transform: translateY(-1px);
  }

  .login-icon {
    font-size: 1rem;
  }
}

.user-area {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 25px;
  color: #00ff00;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover,
  &.active {
    background: rgba(0, 255, 0, 0.2);
    border-color: rgba(0, 255, 0, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }

  .user-avatar {
    font-size: 1rem;
  }

  .username {
    font-weight: 500;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-arrow {
    font-size: 0.7rem;
    transition: transform 0.3s ease;

    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.user-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 150px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.user-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(0, 255, 0, 0.1);
    color: #00ff00;
  }

  .option-icon {
    font-size: 1rem;
  }
}

.language-selector {
  position: relative;
}

.language-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 25px;
  color: #00ffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover,
  &.active {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
  
  .language-icon {
    font-size: 1rem;
  }
  
  .dropdown-arrow {
    font-size: 0.7rem;
    transition: transform 0.3s ease;
    
    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.language-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 150px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.language-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    color: #00ffff;
  }
  
  &.active {
    background: rgba(0, 255, 255, 0.2);
    color: #00ffff;
  }
  
  .flag {
    font-size: 1.1rem;
  }
}

// 颜色循环动画
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

// 响应式设计
@media (max-width: 768px) {
  .topbar {
    padding: 0 1rem;
    height: 50px;
  }

  .topbar-brand .brand-text {
    font-size: 1.2rem;
  }

  .language-button,
  .login-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;

    .language-text,
    .login-text {
      display: none;
    }
  }

  .user-info {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;

    .username {
      max-width: 60px;
    }
  }

  .language-menu {
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .topbar {
    height: 45px;
    padding: 0 0.5rem;
  }

  .topbar-brand .brand-text {
    font-size: 1rem;
  }

  .language-button,
  .login-button {
    padding: 0.3rem 0.6rem;

    .language-icon,
    .login-icon {
      font-size: 0.9rem;
    }
  }

  .user-info {
    padding: 0.3rem 0.6rem;

    .user-avatar {
      font-size: 0.9rem;
    }

    .username {
      max-width: 40px;
      font-size: 0.8rem;
    }
  }
}
</style>
