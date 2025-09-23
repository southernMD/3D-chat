<script setup lang="ts">
import TopBar from '@/components/TopBar.vue'
import ParticleBackground from '@/components/ParticleBackground.vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
authStore.initAuth()
</script>

<template>
  <div class="app-container">
    <TopBar v-show="$route.name !== '3d-chat-room'"/>
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
