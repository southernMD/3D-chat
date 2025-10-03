<template>
  <div class="help-overlay" @click.self="close">
    <div class="help-panel">
      <div class="help-header">
        <h3>帮助</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="help-content">
        <p>欢迎使用 3D 聊天室。</p>
        <p>基础操作：</p>
        <ul>
          <li>W/A/S/D：移动</li>
          <li>鼠标拖拽：视角旋转</li>
          <li>鼠标右键：发射道具</li>
          <li>F：场景交互</li>
          <li>U：关闭ui界面</li>
          <li>F2：关闭FPS显示</li>
          <li>回车：打开文本聊天</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'HelpModal',
  emits: ['close'],
  methods: {
    close() {
      this.$emit('close')
    }
  }
})
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.help-panel {
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  width: 520px;
  max-width: 92vw;
  color: #fff;
}

.help-header {
  padding: 16px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.help-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 22px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.help-content {
  padding: 16px 20px 20px;
  line-height: 1.6;
}

.help-content ul {
  margin: 8px 0 12px;
  padding-left: 18px;
}

.help-content li {
  margin: 4px 0;
}
</style>


