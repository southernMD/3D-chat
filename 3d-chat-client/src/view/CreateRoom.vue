<template>
  <div class="create-room-container">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧配置区域 -->
      <div class="config-section">
        <!-- Tab栏 -->
        <div class="tab-bar">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            :class="['tab-button', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-text">{{ $t(tab.label) }}</span>
          </button>
        </div>
        
        <!-- 配置内容区域 -->
        <div class="config-content">
          <!-- 地图选择 -->
          <div v-if="activeTab === 'map'" class="config-panel">
            <h3 class="panel-title">{{ $t('createRoom.map.title') }}</h3>
            <div class="map-grid">
              <div
                v-for="map in maps"
                :key="map.id"
                :class="['map-card', { selected: selectedMap === map.id }]"
                @click="selectedMap = map.id"
              >
                <div class="map-preview" :class="`map-${map.preview}`">
                  <div class="map-placeholder">{{ map.name }}</div>
                </div>
                <div class="map-info">
                  <h4 class="map-name">{{ map.name }}</h4>
                  <p class="map-description">{{ map.description }}</p>
                </div>
              </div>

              <!-- 添加地图按钮 -->
              <div class="map-card add-map-card" @click="showAddMapDialog">
                <div class="map-preview add-map-preview">
                  <div class="add-map-icon">+</div>
                </div>
                <div class="map-info">
                  <h4 class="map-name">{{ $t('createRoom.map.addMap') }}</h4>
                  <p class="map-description">{{ $t('createRoom.map.addMapDescription') }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 房间设置 -->
          <div v-if="activeTab === 'room'" class="config-panel">
            <h3 class="panel-title">{{ $t('createRoom.room.title') }}</h3>
            <div class="form-group">
              <label class="form-label">{{ $t('createRoom.room.name') }}</label>
              <ThemeInput
                v-model="roomConfig.name"
                type="text"
                :placeholder="$t('createRoom.room.namePlaceholder')"
                size="large"
                clearable
                :maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('createRoom.room.description') }}</label>
              <ThemeInput
                v-model="roomConfig.description"
                type="textarea"
                :placeholder="$t('createRoom.room.descriptionPlaceholder')"
                :rows="4"
                :maxlength="200"
                show-word-limit
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ $t('createRoom.room.maxUsers') }}</label>
              <ThemeSelect
                v-model="roomConfig.maxUsers"
                :options="maxUsersOptions"
                :placeholder="$t('createRoom.room.selectMaxUsers')"
                size="large"
              >
                <template #option="{ option }">
                  <div class="max-users-option">
                    <span class="users-count">{{ option.label }}</span>
                  </div>
                </template>
              </ThemeSelect>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('createRoom.room.privacy') }}</label>
              <ThemeRadioGroup
                v-model="roomConfig.isPrivate"
                :options="privacyOptions"
                direction="horizontal"
              >
                <template #default="{ option, direction }">
                  <div :class="['privacy-option-content', direction]">
                    <div class="privacy-text">
                      <span class="privacy-label">{{ option.label }}</span>
                      <span class="privacy-description">{{ option.description }}</span>
                    </div>
                  </div>
                </template>
              </ThemeRadioGroup>
            </div>
          </div>
          
          <!-- 其他设置 -->
          <div v-if="activeTab === 'other'" class="config-panel">
            <h3 class="panel-title">{{ $t('createRoom.other.title') }}</h3>
            <div class="form-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="roomConfig.enableVoice" />
                <span class="checkbox-text">{{ $t('createRoom.other.enableVoice') }}</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="roomConfig.enableText" />
                <span class="checkbox-text">{{ $t('createRoom.other.enableText') }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧说明区域 -->
      <div class="info-section">
        <div class="info-card">
          <!-- 地图选择信息 -->
          <div v-if="activeTab === 'map'" class="tab-info">
            <h3 class="info-title">{{ currentMapInfo.title }}</h3>
            <div class="info-content">
              <div class="map-detail">
                <div class="map-preview-large" :class="`map-${currentMapInfo.preview}`">
                  <div class="map-placeholder">{{ currentMapInfo.name }}</div>
                </div>
                <div class="map-description">
                  <p>{{ currentMapInfo.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 房间设置信息 -->
          <div v-if="activeTab === 'room'" class="tab-info">
            <h3 class="info-title">{{ $t('createRoom.info.roomTitle') }}</h3>
            <div class="info-content">
              <div class="info-item">
                <span class="info-icon">👥</span>
                <div class="info-text">
                  <h4>{{ $t('createRoom.info.roomFeature1.title') }}</h4>
                  <p>{{ $t('createRoom.info.roomFeature1.description') }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 功能设置信息 -->
          <div v-if="activeTab === 'other'" class="tab-info">
            <h3 class="info-title">{{ $t('createRoom.info.featureTitle') }}</h3>
            <div class="info-content">
              <div class="info-item">
                <span class="info-icon">🎤</span>
                <div class="info-text">
                  <h4>{{ $t('createRoom.info.featureFeature1.title') }}</h4>
                  <p>{{ $t('createRoom.info.featureFeature1.description') }}</p>
                </div>
              </div>
              <div class="info-item">
                <span class="info-icon">�</span>
                <div class="info-text">
                  <h4>{{ $t('createRoom.info.featureFeature2.title') }}</h4>
                  <p>{{ $t('createRoom.info.featureFeature2.description') }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 创建按钮移到右侧面板底部 -->
          <div class="create-button-section">
            <button
              class="create-button"
              :disabled="!canCreate"
              @click="createRoom"
            >
              <span class="button-text">{{ $t('createRoom.createButton') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ThemeSelect from '@/components/ThemeSelect.vue'
import ThemeInput from '@/components/ThemeInput.vue'
import ThemeRadioGroup from '@/components/ThemeRadioGroup.vue'
import type { SelectOption } from '@/components/ThemeSelect.vue'
import type { RadioOption } from '@/components/ThemeRadioGroup.vue'
import { showInfo, showSuccess, showError, showWarning } from '@/utils/message'

const { t } = useI18n()
const router = useRouter()

// Tab配置
const tabs = [
  { key: 'map', icon: '🗺️', label: 'createRoom.tabs.map' },
  { key: 'room', icon: '🏠', label: 'createRoom.tabs.room' },
  { key: 'other', icon: '⚙️', label: 'createRoom.tabs.other' }
]

// 当前活跃的Tab
const activeTab = ref('map')

// 地图数据
const maps = ref([
  {
    id: 'school',
    name: t('createRoom.map.school'),
    description: t('createRoom.map.schoolDescription'),
    preview: 'school',
    available: true,
    title: t('createRoom.map.school'),
  },
  {
    id: 'forest',
    name: t('createRoom.map.forestCabin'),
    description: t('createRoom.map.forestCabinDescription'),
    preview: 'forest',
    available: true,
    title: t('createRoom.map.forestCabin'),
  }
])

// 当前选中地图的详细信息
const currentMapInfo = computed(() => {
  const map = maps.value.find(m => m.id === selectedMap.value)
  return map || maps.value[0]
})

// 选中的地图
const selectedMap = ref('space-station')

// 最大用户数选项
const maxUsersOptions: SelectOption[] = [
  {
    label: `2 ${t('createRoom.room.users')}`,
    value: '2',
    disabled: false
  },
  {
    label: `4 ${t('createRoom.room.users')}`,
    value: '4',
    disabled: false
  },
  {
    label: `6 ${t('createRoom.room.users')}`,
    value: '6',
    disabled: false
  }
]

// 隐私选项
const privacyOptions: RadioOption[] = [
  {
    label: t('createRoom.room.public'),
    value: false,
    description: t('createRoom.room.publicDescription')
  },
  {
    label: t('createRoom.room.private'),
    value: true,
    description: t('createRoom.room.privateDescription')
  }
]

// 房间配置
const roomConfig = reactive({
  name: '',
  description: '',
  maxUsers: '6',
  isPrivate: false,
  enableVoice: true,
  enableText: true,
})

// 检查是否可以创建房间
const canCreate = computed(() => {
  return roomConfig.name.trim().length > 0 && selectedMap.value
})

// 显示添加地图提示
const showAddMapDialog = () => {
  showInfo(t('createRoom.map.notSupportedDescription'))
}

// 创建房间
const createRoom = async () => {
  if (!canCreate.value) {
    showWarning(t('createRoom.validation.incomplete'))
    return
  }

  try {
    // TODO: 调用API创建房间
    console.log('Creating room with config:', {
      ...roomConfig,
      map: selectedMap.value
    })

    showSuccess(t('createRoom.roomConfigSaved'))
    
    // 直接跳转到模型选择页面，路由守卫会检查来源
    router.push({
      path: '/model-selection',
      state:{
        mapConfig: JSON.stringify({
          ...roomConfig,
          map: selectedMap.value
        })
      }
    })
  } catch (error) {
    console.error('Failed to create room:', error)
    showError(t('createRoom.error'))
  }
}
</script>

<style scoped lang="less">
.create-room-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow-x: hidden;
}

.main-content {
  display: flex;
  gap: 30px;
  padding: 120px 40px 40px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100vh;
}

.config-section {
  flex: 2;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.tab-button {
  flex: 1;
  padding: 20px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 1rem;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    color: #00ffff;
  }

  &.active {
    background: rgba(0, 255, 255, 0.2);
    color: #00ffff;
    border-bottom: 2px solid #00ffff;
  }
}

.tab-icon {
  font-size: 1.2rem;
}

.config-content {
  padding: 30px;
  flex: 1;
  overflow-y: auto;

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.5);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 255, 255, 0.7);
    }
  }
}

.config-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-title {
  font-size: 1.8rem;
  color: #00ffff;
  margin-bottom: 30px;
  text-align: center;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.map-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
    transform: translateY(-5px);
  }

  &.selected {
    border-color: #00ffff;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
}

.map-preview {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &.map-school {
    background: linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #2a2a6e 100%);
  }

  &.map-forest {
    background: linear-gradient(135deg, #0a2e0a 0%, #1a4e1a 50%, #2a6e2a 100%);
  }

  &.map-city {
    background: linear-gradient(135deg, #2e2e0a 0%, #4e4e1a 50%, #6e6e2a 100%);
  }
}

.map-placeholder {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  padding: 20px;
}

.add-map-card {
  border: 2px dashed rgba(255, 255, 255, 0.3);

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
    border-style: dashed;
  }
}

.add-map-preview {
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-map-icon {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 300;
}

.map-info {
  padding: 15px;
}

.map-name {
  color: #ffffff;
  font-size: 1.1rem;
  margin-bottom: 5px;
}

.map-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 25px;
}

.form-label {
  display: block;
  color: #00ffff;
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 1.1rem;
}



// 最大用户数选项样式
.max-users-option {
  display: flex;
  align-items: center;
  width: 100%;

  .users-count {
    color: inherit;
    font-weight: 500;
  }
}

// 隐私选项样式
.privacy-option-content {
  display: flex;
  gap: 12px;
  width: 100%;

  // 横向排列时：文本纵向排列
  &.horizontal {
    flex-direction: row;
    align-items: center;

    .privacy-text {
      flex: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
  }

  // 纵向排列时：文本横向排列
  &.vertical {
    flex-direction: row;
    align-items: flex-start;

    .privacy-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }

  .privacy-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .privacy-label {
    color: white;
    font-weight: 600;
    font-size: 1rem;
  }

  .privacy-description {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    line-height: 1.4;
  }
}

// 地图详细信息样式
.map-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-preview-large {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &.map-school {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  }

  &.map-forest {
    background: linear-gradient(135deg, #2d5016 0%, #3e6b1f 50%, #4f7942 100%);
  }

  &.map-city {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #5d6d7e 100%);
  }

  .map-placeholder {
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
}

.map-description {
  p {
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    margin-bottom: 12px;
  }
}

.feature-tag {
  background: rgba(0, 255, 255, 0.2);
  color: #00ffff;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  border: 1px solid rgba(0, 255, 255, 0.3);
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #00ffff;
  }
}

.info-section {
  flex: 1;
  min-width: 300px;
  height: 100%;
}

.info-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 30px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.info-title {
  font-size: 1.5rem;
  color: #ff00ff;
  margin-bottom: 25px;
  text-align: center;
}

.info-content {
  flex: 1;
  overflow-y: auto;
}

.info-item {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;

  &:last-child {
    margin-bottom: 0;
  }
}

.info-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.info-text {
  h4 {
    color: #ffffff;
    font-size: 1.1rem;
    margin-bottom: 5px;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    line-height: 1.4;
  }
}

.create-button-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 0, 255, 0.2);
}

.create-button {
  width: 100%;
  padding: 20px;
  background: linear-gradient(45deg, #00ffff, #ff00ff);
  border: none;
  border-radius: 15px;
  color: #000000;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 255, 255, 0.4);
    background: linear-gradient(45deg, #ff00ff, #00ffff);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.button-icon {
  font-size: 1.3rem;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    padding: 100px 20px;
    height: auto;
    min-height: calc(100vh - 140px);
  }

  .config-section,
  .info-section {
    height: auto;
  }

  .tab-bar {
    flex-direction: column;
  }

  .radio-group {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
