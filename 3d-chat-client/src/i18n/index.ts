import { createI18n } from 'vue-i18n'

// 中文翻译
const zh = {
  nav: {
    brand: 'NEXUS³',
    language: '语言'
  },
  home: {
    title: '在第三维度聊天',
    subtitle: 'NEXUS³',
    enterButton: '进入维度',
    description: '体验前所未有的沉浸式3D交流'
  },
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认'
  },
  footer: {
    subtitle: '在第三维度聊天',
    product: '产品',
    features: '功能特性',
    pricing: '价格方案',
    demo: '演示',
    api: 'API接口',
    company: '公司',
    about: '关于我们',
    team: '团队',
    careers: '招聘',
    contact: '联系我们',
    resources: '资源',
    documentation: '文档',
    blog: '博客',
    support: '技术支持',
    community: '社区',
    connect: '联系我们',
    allRightsReserved: '版权所有。',
    privacy: '隐私政策',
    terms: '服务条款',
    cookies: 'Cookie政策',
    poweredBy: '技术支持'
  }
}

// 英文翻译
const en = {
  nav: {
    brand: 'NEXUS³',
    language: 'Language'
  },
  home: {
    title: 'Chat in the Third Dimension',
    subtitle: 'NEXUS³',
    enterButton: 'Enter the Dimension',
    description: 'Experience immersive 3D communication like never before'
  },
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm'
  },
  footer: {
    subtitle: 'Chat in the Third Dimension',
    product: 'Product',
    features: 'Features',
    pricing: 'Pricing',
    demo: 'Demo',
    api: 'API',
    company: 'Company',
    about: 'About',
    team: 'Team',
    careers: 'Careers',
    contact: 'Contact',
    resources: 'Resources',
    documentation: 'Documentation',
    blog: 'Blog',
    support: 'Support',
    community: 'Community',
    connect: 'Connect',
    allRightsReserved: 'All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    cookies: 'Cookie Policy',
    poweredBy: 'Powered by'
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
