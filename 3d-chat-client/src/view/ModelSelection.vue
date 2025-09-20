<template>
  <div class="model-selection-container">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧模型选择区域 -->
      <div class="model-section">
        <h2 class="section-title">{{ $t('modelSelection.title') }}</h2>
        
        <!-- 搜索和上传区域 -->
        <div class="action-bar">
          <div class="search-container">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('modelSelection.searchPlaceholder')"
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>
          
          <!-- 文件上传组件 -->
          <FileUploader
            :multiple="true"
            :max-file-size="100"
            :auto-upload="false"
            @file-selected="handleFileSelected"
            @upload-completed="handleUploadCompleted"
            @upload-error="handleUploadError"
          />
        </div>
        
        <!-- 模型网格 -->
        <div class="model-grid">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            :class="['model-card', { selected: selectedModel === model.id }]"
            @click="selectedModel = model.id"
          >
            <div class="model-preview" :class="`model-${model.type}`">
              <div class="model-thumbnail">
                <span class="model-icon">{{ model.icon }}</span>
              </div>
            </div>
            <div class="model-info">
              <h4 class="model-name">{{ model.name }}</h4>
              <p class="model-category">{{ model.category }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧模型描述区域 -->
      <div class="description-section">
        <div class="description-card">
          <div v-if="currentModelInfo" class="model-detail">
            <h3 class="detail-title">{{ currentModelInfo.name }}</h3>
            
            <!-- 模型预览 -->
            <div class="model-preview-large" :class="`model-${currentModelInfo.type}`">
              <div class="model-display">
                <span class="model-icon-large">{{ currentModelInfo.icon }}</span>
              </div>
            </div>
            
            <!-- 模型信息 -->
            <div class="model-details">
              <div class="detail-item">
                <span class="detail-label">{{ $t('modelSelection.category') }}:</span>
                <span class="detail-value">{{ currentModelInfo.category }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">{{ $t('modelSelection.type') }}:</span>
                <span class="detail-value">{{ currentModelInfo.type }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">{{ $t('modelSelection.polygons') }}:</span>
                <span class="detail-value">{{ currentModelInfo.polygons }}</span>
              </div>
            </div>
            
            <!-- 模型描述 -->
            <div class="model-description">
              <h4>{{ $t('modelSelection.description') }}</h4>
              <p>{{ currentModelInfo.description }}</p>
            </div>
            
            <!-- 特性标签 -->
            <div class="model-features">
              <span
                v-for="feature in currentModelInfo.features"
                :key="feature"
                class="feature-tag"
              >
                {{ feature }}
              </span>
            </div>
          </div>
          
          <!-- 确认按钮 -->
          <div class="confirm-button-section">
            <button
              class="confirm-button"
              :disabled="!selectedModel"
              @click="confirmModelSelection"
            >
              <span class="button-text">{{ $t('modelSelection.confirmButton') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import FileUploader from '@/components/FileUploader.vue'

const { t } = useI18n()
const router = useRouter()

// 搜索查询
const searchQuery = ref('')

// 选中的模型
const selectedModel = ref('')

// 模型数据
const models = ref([
  {
    id: 'casual-male',
    name: t('modelSelection.models.casualMale.name'),
    category: t('modelSelection.models.casualMale.category'),
    type: 'character',
    icon: '🧑‍💼',
    polygons: '15K',
    description: t('modelSelection.models.casualMale.description'),
    features: [t('modelSelection.features.rigged'), t('modelSelection.features.animated')]
  },
  {
    id: 'casual-female',
    name: t('modelSelection.models.casualFemale.name'),
    category: t('modelSelection.models.casualFemale.category'),
    type: 'character',
    icon: '👩‍💼',
    polygons: '16K',
    description: t('modelSelection.models.casualFemale.description'),
    features: [t('modelSelection.features.rigged'), t('modelSelection.features.animated')]
  },
  {
    id: 'robot',
    name: t('modelSelection.models.robot.name'),
    category: t('modelSelection.models.robot.category'),
    type: 'character',
    icon: '🤖',
    polygons: '12K',
    description: t('modelSelection.models.robot.description'),
    features: [t('modelSelection.features.rigged'), t('modelSelection.features.sciFi')]
  },
  {
    id: 'fantasy-warrior',
    name: t('modelSelection.models.fantasyWarrior.name'),
    category: t('modelSelection.models.fantasyWarrior.category'),
    type: 'character',
    icon: '⚔️',
    polygons: '20K',
    description: t('modelSelection.models.fantasyWarrior.description'),
    features: [t('modelSelection.features.rigged'), t('modelSelection.features.fantasy')]
  }
])

// 过滤后的模型
const filteredModels = computed(() => {
  if (!searchQuery.value) {
    return models.value
  }
  return models.value.filter(model =>
    model.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    model.category.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 当前模型信息
const currentModelInfo = computed(() => {
  return models.value.find(model => model.id === selectedModel.value) || models.value[0]
})

// 检查访问权限
onMounted(() => {
  // 默认选择第一个模型
  if (models.value.length > 0) {
    selectedModel.value = models.value[0].id
  }
})

// 文件选择处理
const handleFileSelected = (files: File[]) => {
  console.log('Files selected:', files)
  ElMessage.info(`已选择 ${files.length} 个文件`)
}

// 文件上传完成处理
const handleUploadCompleted = (file: any) => {
  console.log('File uploaded:', file)
  ElMessage.success(`文件 ${file.name} 上传成功！`)
}

// 文件上传错误处理
const handleUploadError = (file: any, error: string) => {
  console.error('Upload error:', error)
  ElMessage.error(`文件 ${file.name} 上传失败：${error}`)
}

// 确认模型选择
const confirmModelSelection = () => {
  if (!selectedModel.value) {
    ElMessage.error(t('modelSelection.pleaseSelectModel'))
    return
  }
  
  console.log('Selected model:', selectedModel.value)
  ElMessage.success(t('modelSelection.modelSelected'))
  
  // TODO: 保存选择的模型并跳转到房间
  // 这里可以跳转到实际的房间页面或返回房间大厅
  router.push('/lobby')
}
</script>

<style scoped lang="less">
.model-selection-container {
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

.model-section {
  flex: 2;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 30px;
  overflow-y: auto;

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

.section-title {
  font-size: 2rem;
  color: #00ffff;
  margin-bottom: 30px;
  text-align: center;
}

.action-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  align-items: center;
}

.search-container {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 15px 50px 15px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1rem;
  backdrop-filter: blur(10px);

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.2rem;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.model-card {
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

.model-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);

  &.model-character {
    background: linear-gradient(135deg, #2a1a4e 0%, #3a2a6e 100%);
  }
}

.model-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-icon {
  font-size: 3rem;
}

.model-info {
  padding: 15px;
}

.model-name {
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 5px;
  font-weight: 600;
}

.model-category {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

.description-section {
  flex: 1;
  min-width: 350px;
}

.description-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 0, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 30px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-title {
  font-size: 1.5rem;
  color: #ff00ff;
  margin-bottom: 25px;
  text-align: center;
}

.model-preview-large {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  margin-bottom: 20px;

  &.model-character {
    background: linear-gradient(135deg, #2a1a4e 0%, #3a2a6e 100%);
  }
}

.model-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-icon-large {
  font-size: 5rem;
}

.model-details {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.detail-value {
  color: #ffffff;
  font-weight: 600;
}

.model-description {
  margin-bottom: 20px;

  h4 {
    color: #ffffff;
    margin-bottom: 10px;
    font-size: 1.1rem;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
  }
}

.model-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 30px;
}

.feature-tag {
  background: rgba(0, 255, 255, 0.2);
  color: #00ffff;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  border: 1px solid rgba(0, 255, 255, 0.3);
}

.confirm-button-section {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 0, 255, 0.2);
}

.confirm-button {
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

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    padding: 100px 20px;
    height: auto;
    min-height: calc(100vh - 140px);
  }

  .action-bar {
    flex-direction: column;
    gap: 15px;
  }

  .model-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
  }
}
</style>