//引入路由对象
import { createRouter, createWebHistory, createWebHashHistory, createMemoryHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

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
    }, {
        path: '/home',
        name: 'home',
        component: () => import('@/view/home.vue')
    }
]



const router = createRouter({
    // scrollBehavior(){
    //     return {top:0,left:0};
    // },
    history: createWebHistory(),
    routes,
})


//导出router
export default router



