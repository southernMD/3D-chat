<script setup lang="ts">
import TopBar from '@/components/TopBar.vue'
import ParticleBackground from '@/components/ParticleBackground.vue'
</script>

<template>
  <div class="app-container">
    <!-- 全局粒子背景 -->
    <ParticleBackground />
    
    <!-- 全局顶部导航栏 -->
    <TopBar />
    
    <!-- 路由视图 -->
    <div class="router-view-container">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  min-height: 100vh;
}

.router-view-container {
  position: relative;
  z-index: 1;
}
</style>
