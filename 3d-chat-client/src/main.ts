import { createApp } from 'vue'
import '@/assets/base.css'
import App from './App.vue'
import {createPinia } from 'pinia'
import router from '@/router'
import i18n from '@/i18n'
import { modelPreloadService } from '@/services/ModelPreloadService'

const pinia = createPinia()
const app = createApp(App)

// 配置Element Plus全局属性
app.config.globalProperties.$ELEMENT = {
  size: 'default',
  zIndex: 3000
}

app.use(pinia)
app.use(router)
app.use(i18n)

app.mount('#app')

// 🚀 应用挂载后立即在后台开始预加载模型
// 延迟1秒避免影响首屏渲染
setTimeout(() => {
  console.log('🚀 启动后台模型预加载...')
  modelPreloadService.startPreloading()
}, 1000)
