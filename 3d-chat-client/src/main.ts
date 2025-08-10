import { createApp } from 'vue'
import '@/assets/base.css'
import App from './App.vue'
import {createPinia } from 'pinia'
import router from '@/router'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)

// 初始化认证状态
const authStore = useAuthStore()
authStore.initAuth()

app.mount('#app')
