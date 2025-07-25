import { createI18n } from 'vue-i18n'

// 中文翻译
const zh = {
  nav: {
    brand: 'Loot³',
    language: '语言'
  },
  home: {
    title: '在第三维度聊天',
    subtitle: 'Loot³',
    enterButton: '进入维度',
    description: '体验前所未有的沉浸式3D交流'
  },
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认'
  }
}

// 英文翻译
const en = {
  nav: {
    brand: 'Loot³',
    language: 'Language'
  },
  home: {
    title: 'Chat in the Third Dimension',
    subtitle: 'Loot³',
    enterButton: 'Enter the Dimension',
    description: 'Experience immersive 3D communication like never before'
  },
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm'
  }
}

const messages = {
  zh,
  en
}

// 获取浏览器语言
const getDefaultLocale = () => {
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

// 创建i18n实例
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || getDefaultLocale(),
  fallbackLocale: 'en',
  messages
})

export default i18n
