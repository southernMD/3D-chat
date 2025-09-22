//引入路由对象
import { createRouter, createWebHistory, createWebHashHistory, createMemoryHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

//vue2 mode history vue3 createWebHistory
//vue2 mode  hash  vue3  createWebHashHistory
//vue2 mode abstact vue3  createMemoryHistory

//路由数组的类型 RouteRecordRaw
// 定义一些路由
// 每个路由都需要映射到一个组件。
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/home',
    },
    {
        path: '/home',
        name: 'home',
        component: () => import('@/view/home.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/view/Login.vue'),
        meta: { requiresAuth: false, hideForAuth: true }
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('@/view/Register.vue'),
        meta: { requiresAuth: false, hideForAuth: true }
    },

    {
        path: '/create-room',
        name: 'create-room',
        component: () => import('@/view/CreateRoom.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/mode-selection',
        name: 'mode-selection',
        component: () => import('@/view/ModeSelectionPage.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/lobby',
        name: 'lobby',
        component: () => import('@/view/RoomLobby.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/model-selection',
        name: 'model-selection',
        component: () => import('@/view/ModelSelection.vue'),
        meta: { requiresAuth: true },
        beforeEnter: (to, from, next) => {
            // 只允许从创建房间页面跳转过来
            if (from.name === 'create-room' || from.name === 'mode-selection' && from.query.pingCode?.length !== 0) {
                next()
            } else {
                // 直接访问或从其他页面跳转，重定向到首页
                next({ name: 'home' })
            }
        }
    },
    {
        path: '/chat-room',
        name: 'chat-room',
        component: () => import('@/view/ChatRoom.vue'),
        meta: { requiresAuth: true },
        beforeEnter: (to, from, next) => {
            // 只允许从模型选择页面跳转过来
            if (from.name === 'model-selection') {
                next()
            } else {
                // 直接访问或从其他页面跳转，重定向到首页
                next({ name: 'home' })
            }
        }
    },
    {
        // 捕获所有未匹配的路由，重定向到首页
        path: '/:pathMatch(.*)*',
        redirect: '/home'
    }
]



const router = createRouter({
    // scrollBehavior(){
    //     return {top:0,left:0};
    // },
    history: createWebHistory(),
    routes,
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // 初始化认证状态（仅在首次访问时）
    const hasToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    if (!authStore.isAuthenticated && hasToken) {
        await authStore.initAuth()
    }

    // 检查是否需要认证
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        // 需要认证但未登录，跳转到登录页
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
    }

    // 检查是否已登录用户访问登录/注册页面
    if (to.meta.hideForAuth && authStore.isAuthenticated) {
        // 已登录用户访问登录/注册页面，跳转到首页
        next({ name: 'home' })
        return
    }

    next()
})

//导出router
export default router



