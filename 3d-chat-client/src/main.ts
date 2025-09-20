import { createApp } from 'vue'
import '@/assets/base.css'
import App from './App.vue'
import {createPinia } from 'pinia'
import router from '@/router'
import i18n from '@/i18n'

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
